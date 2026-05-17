import {
  applyAction,
  getLegalActions,
  initHand,
  type ActionType,
  type BotDifficulty,
  type GameState,
  type HandHistory,
  type Player,
  type PlayerAction,
} from '@river/engine';
import type {
  ChatMessage,
  HandHistoryRecord,
  LobbyTableSummary,
  PublicGameState,
  PublicPlayer,
  SessionUser,
  TableConfig,
} from '@river/shared';
import { getBotDecision } from './bot-strategy';

type HumanSeat = {
  kind: 'HUMAN';
  userId: string;
  username: string;
  stack: number;
  connected: boolean;
  disconnectDeadline: number | null;
  isHost: boolean;
};

type BotSeat = {
  kind: 'BOT';
  userId: string;
  username: string;
  stack: number;
  difficulty: BotDifficulty;
};

type Seat = HumanSeat | BotSeat;

const botNames: Record<BotDifficulty, string[]> = {
  BEGINNER: ['Fish Freddy', 'Loose Lucy', 'Calling Carl', 'River Rita'],
  INTERMEDIATE: ['TAG Terry', 'Position Paul', 'Value Vera', 'Range Rina'],
  ADVANCED: ['GTO Gary', 'Solver Sam', 'Equity Eva', 'Node Nora'],
};

function makeJoinCode(): string {
  return `RIVER-${Math.floor(1000 + Math.random() * 9000)}`;
}

function toPlayer(seat: Seat, index: number): Player {
  const player: Player = {
    id: seat.userId,
    name: seat.username,
    stack: seat.stack,
    holeCards: null,
    position: 'BTN',
    seatIndex: index,
    isHuman: seat.kind === 'HUMAN',
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalInvested: 0,
    isBot: seat.kind === 'BOT',
  };

  return seat.kind === 'BOT'
    ? { ...player, botDifficulty: seat.difficulty }
    : player;
}

function handHistoryFromState(state: GameState, tableId: string): HandHistoryRecord {
  const holeCards = Object.fromEntries(
    state.players
      .filter((player): player is Player & { holeCards: NonNullable<Player['holeCards']> } => player.holeCards !== null)
      .map((player) => [player.id, player.holeCards]),
  );
  const streets = state.actionHistory.reduce<HandHistory['streets']>((rows, action) => {
    const index = rows.findIndex((row) => row.street === action.street);
    const potAfter = state.pots.reduce((sum, pot) => sum + pot.amount, 0);

    if (index === -1) {
      return [...rows, {
        street: action.street,
        communityCards: state.communityCards,
        actions: [action],
        potAfter,
      }];
    }

    return rows.map((row, rowIndex) => rowIndex === index ? {
      ...row,
      actions: [...row.actions, action],
      potAfter,
    } : row);
  }, []);

  return {
    id: crypto.randomUUID(),
    tableId,
    handNumber: state.handNumber,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      stack: player.stack,
    })),
    holeCards,
    streets,
    pots: state.pots,
    winners: state.winners,
    createdAt: Date.now(),
  };
}

export class PokerTable {
  readonly id = crypto.randomUUID();
  readonly code = makeJoinCode();
  readonly createdAt = Date.now();
  private seats: Seat[] = [];
  private messages: ChatMessage[] = [];
  private gameState: GameState | null = null;
  private handNumber = 0;
  private botTurnTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private config: TableConfig,
    host: SessionUser,
    buyIn: number,
  ) {
    this.seats.push({
      kind: 'HUMAN',
      userId: host.id,
      username: host.username,
      stack: buyIn,
      connected: true,
      disconnectDeadline: null,
      isHost: true,
    });
  }

  get playerIds(): string[] {
    return this.seats.filter((seat) => seat.kind === 'HUMAN').map((seat) => seat.userId);
  }

  get hostId(): string {
    const host = this.seats.find((seat) => seat.kind === 'HUMAN' && seat.isHost);
    return host?.userId ?? this.seats[0]?.userId ?? '';
  }

  get isEmpty(): boolean {
    return this.seats.every((seat) => seat.kind === 'BOT');
  }

  summary(): LobbyTableSummary {
    const humans = this.seats.filter((seat) => seat.kind === 'HUMAN');
    const host = humans.find((seat) => seat.isHost) ?? humans[0];

    return {
      id: this.id,
      code: this.code,
      name: this.config.name,
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
      minBuyIn: this.config.minBuyIn,
      maxBuyIn: this.config.maxBuyIn,
      maxPlayers: this.config.maxPlayers,
      humanPlayers: humans.length,
      occupiedSeats: this.seats.length,
      isPrivate: this.config.isPrivate,
      phase: this.gameState?.phase ?? 'LOBBY',
      hostUsername: host?.username ?? 'Table',
    };
  }

  publicState(viewerId: string): PublicGameState | null {
    if (!this.gameState) {
      return null;
    }

    const showdownIds = new Set(
      this.gameState.winners
        .filter((winner) => winner.showCards)
        .map((winner) => winner.playerId),
    );
    const players: PublicPlayer[] = this.gameState.players.map((player) => {
      const seat = this.seats.find((candidate) => candidate.userId === player.id);
      const reveal = player.id === viewerId || (this.gameState?.phase === 'HAND_COMPLETE' && showdownIds.has(player.id));

      return {
        ...player,
        holeCards: reveal ? player.holeCards : null,
        connected: seat?.kind === 'BOT' ? true : seat?.connected ?? false,
        disconnectDeadline: seat?.kind === 'HUMAN' ? seat.disconnectDeadline : null,
        isHost: seat?.kind === 'HUMAN' ? seat.isHost : false,
      };
    });

    return {
      ...this.gameState,
      players,
      deckCount: this.gameState.deck.length,
    };
  }

  tableMessages(): ChatMessage[] {
    return this.messages.slice(-50);
  }

  addHuman(user: SessionUser, buyIn: number): void {
    if (this.seats.some((seat) => seat.userId === user.id)) {
      this.reconnect(user.id);
      return;
    }

    if (this.seats.length >= this.config.maxPlayers) {
      throw new Error('Table is full.');
    }

    if (this.gameState) {
      throw new Error('This table is already in a hand. Join the next one.');
    }

    this.seats.push({
      kind: 'HUMAN',
      userId: user.id,
      username: user.username,
      stack: buyIn,
      connected: true,
      disconnectDeadline: null,
      isHost: false,
    });
    this.system(`${user.username} sits in.`);
  }

  reconnect(userId: string): void {
    const seat = this.seats.find((candidate) => candidate.userId === userId);

    if (seat?.kind !== 'HUMAN') {
      return;
    }

    seat.connected = true;
    seat.disconnectDeadline = null;
    const timer = this.disconnectTimers.get(userId);

    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }
  }

  disconnect(userId: string, onTimeout: () => void): void {
    const seat = this.seats.find((candidate) => candidate.userId === userId);

    if (seat?.kind !== 'HUMAN') {
      return;
    }

    seat.connected = false;

    if (!this.gameState || this.gameState.phase === 'HAND_COMPLETE') {
      return;
    }

    seat.disconnectDeadline = Date.now() + 30000;
    const existing = this.disconnectTimers.get(userId);

    if (existing) {
      clearTimeout(existing);
    }

    this.disconnectTimers.set(userId, setTimeout(() => {
      const latestSeat = this.seats.find((candidate) => candidate.userId === userId);

      if (latestSeat?.kind === 'HUMAN' && !latestSeat.connected) {
        this.forceFoldDisconnected(userId);
        onTimeout();
      }
    }, 30000));
  }

  removeHuman(userId: string): number {
    const index = this.seats.findIndex((seat) => seat.userId === userId && seat.kind === 'HUMAN');
    const seat = this.seats[index];

    if (!seat || seat.kind !== 'HUMAN') {
      return 0;
    }

    if (this.gameState && this.gameState.phase !== 'HAND_COMPLETE') {
      this.forceFoldDisconnected(userId);
    }

    const statePlayer = this.gameState?.players.find((player) => player.id === userId);
    const cashout = statePlayer?.stack ?? seat.stack;
    this.seats.splice(index, 1);

    if (seat.isHost) {
      const nextHuman = this.seats.find((candidate): candidate is HumanSeat => candidate.kind === 'HUMAN');

      if (nextHuman) {
        nextHuman.isHost = true;
      }
    }

    this.system(`${seat.username} leaves the table.`);
    return cashout;
  }

  start(): void {
    if (this.gameState?.phase && this.gameState.phase !== 'HAND_COMPLETE') {
      throw new Error('A hand is already in progress.');
    }

    this.fillBotsIfNeeded();
    const activeSeats = this.seats.filter((seat) => seat.stack > 0);

    if (activeSeats.length < 2) {
      throw new Error('At least two seats need chips.');
    }

    this.handNumber += 1;
    const players = activeSeats.map(toPlayer);
    this.seats = activeSeats;
    this.gameState = {
      ...initHand(players, this.gameState?.dealerIndex ?? -1, {
        small: this.config.smallBlind,
        big: this.config.bigBlind,
      }),
      handNumber: this.handNumber,
    };
  }

  setBotFill(enabled: boolean): void {
    this.config = {
      ...this.config,
      fillWithBots: enabled,
    };
  }

  act(userId: string, action: ActionType, amount = 0): { completedHand: HandHistoryRecord | null; botAction: PlayerAction | null } {
    if (!this.gameState) {
      throw new Error('No hand in progress.');
    }

    const player = this.gameState.players[this.gameState.currentPlayerIndex];

    if (!player) {
      throw new Error('No current player.');
    }

    if (player.id !== userId) {
      throw new Error('It is not your turn.');
    }

    const playerAction: PlayerAction = {
      type: action,
      amount,
      playerId: player.id,
      street: this.gameState.street,
      timestamp: Date.now(),
    };
    return this.applyPlayerAction(playerAction, player.isBot ? playerAction : null);
  }

  runBotTurn(): { completedHand: HandHistoryRecord | null; action: PlayerAction | null } {
    if (!this.gameState || this.gameState.phase === 'HAND_COMPLETE') {
      return { completedHand: null, action: null };
    }

    const player = this.gameState.players[this.gameState.currentPlayerIndex];

    if (!player?.isBot) {
      return { completedHand: null, action: null };
    }

    const legal = getLegalActions(this.gameState);
    const decision = getBotDecision(this.gameState, player, legal);
    const action: PlayerAction = {
      type: decision.action,
      amount: decision.amount,
      playerId: player.id,
      street: this.gameState.street,
      timestamp: Date.now(),
    };

    return {
      ...this.applyPlayerAction(action, action),
      action,
    };
  }

  scheduleBotTurn(run: () => void): void {
    if (this.botTurnTimer) {
      clearTimeout(this.botTurnTimer);
      this.botTurnTimer = null;
    }

    if (!this.gameState || this.gameState.phase === 'HAND_COMPLETE') {
      return;
    }

    const player = this.gameState.players[this.gameState.currentPlayerIndex];

    if (!player?.isBot) {
      return;
    }

    const legal = getLegalActions(this.gameState);
    const decision = getBotDecision(this.gameState, player, legal);
    this.botTurnTimer = setTimeout(run, decision.thinkMs);
  }

  appendBotTalk(playerId: string, text: string): void {
    const player = this.gameState?.players.find((candidate) => candidate.id === playerId);

    if (!player || !text) {
      return;
    }

    this.messages.push({
      id: crypto.randomUUID(),
      tableId: this.id,
      playerId,
      username: player.name,
      text,
      kind: 'BOT',
      createdAt: Date.now(),
    });
  }

  addChat(userId: string, text: string): void {
    const seat = this.seats.find((candidate) => candidate.userId === userId);
    const trimmed = text.trim().slice(0, 160);

    if (!seat || !trimmed) {
      return;
    }

    this.messages.push({
      id: crypto.randomUUID(),
      tableId: this.id,
      playerId: userId,
      username: seat.username,
      text: trimmed,
      kind: 'PLAYER',
      createdAt: Date.now(),
    });
  }

  private applyPlayerAction(action: PlayerAction, botAction: PlayerAction | null): { completedHand: HandHistoryRecord | null; botAction: PlayerAction | null } {
    if (!this.gameState) {
      throw new Error('No hand in progress.');
    }

    const nextState = applyAction(this.gameState, action);
    this.gameState = nextState;
    this.syncStacksFromState(nextState);
    const completedHand = nextState.phase === 'HAND_COMPLETE'
      ? handHistoryFromState(nextState, this.id)
      : null;

    return { completedHand, botAction };
  }

  private forceFoldDisconnected(userId: string): void {
    if (!this.gameState || this.gameState.phase === 'HAND_COMPLETE') {
      return;
    }

    const player = this.gameState.players[this.gameState.currentPlayerIndex];

    if (player?.id !== userId) {
      return;
    }

    this.applyPlayerAction({
      type: 'FOLD',
      amount: 0,
      playerId: userId,
      street: this.gameState.street,
      timestamp: Date.now(),
    }, null);
  }

  private syncStacksFromState(state: GameState): void {
    this.seats = this.seats.map((seat) => {
      const player = state.players.find((candidate) => candidate.id === seat.userId);
      return player ? { ...seat, stack: player.stack } : seat;
    });
  }

  private fillBotsIfNeeded(): void {
    if (!this.config.fillWithBots) {
      return;
    }

    const targetSeats = Math.min(this.config.maxPlayers, Math.max(2, this.seats.length));

    while (this.seats.length < targetSeats) {
      const names = botNames[this.config.botDifficulty];
      const name = names[this.seats.length % names.length] ?? `Bot ${this.seats.length + 1}`;
      this.seats.push({
        kind: 'BOT',
        userId: `bot-${crypto.randomUUID()}`,
        username: name,
        stack: this.config.maxBuyIn,
        difficulty: this.config.botDifficulty,
      });
    }
  }

  private system(text: string): void {
    this.messages.push({
      id: crypto.randomUUID(),
      tableId: this.id,
      playerId: 'system',
      username: 'River',
      text,
      kind: 'SYSTEM',
      createdAt: Date.now(),
    });
  }
}
