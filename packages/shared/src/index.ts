import type {
  ActionType,
  BotDifficulty,
  Card,
  GameState,
  Player,
  PlayerAction,
  Pot,
  Street,
  WinnerResult,
} from '@river/engine';

export const RIVER_PROTOCOL_VERSION = 1;

export type SessionUser = {
  id: string;
  username: string;
  chipBalance: number;
  handsPlayed: number;
  handsWon: number;
  totalProfit: number;
  createdAt: number;
  lastSeenAt: number;
};

export type AuthRequest = {
  username: string;
  token?: string;
};

export type AuthResponse = {
  user: SessionUser;
  token: string;
};

export type ApiErrorResponse = {
  error: string;
};

export type PublicPlayer = Omit<Player, 'holeCards'> & {
  holeCards: [Card, Card] | null;
  connected: boolean;
  disconnectDeadline: number | null;
  isHost: boolean;
};

export type PublicPlayerMeta = {
  playerId: string;
  connected: boolean;
  disconnectDeadline: number | null;
  isHost: boolean;
};

export type PublicGameState = Omit<GameState, 'players' | 'deck'> & {
  players: PublicPlayer[];
  deckCount: number;
};

export type TableConfig = {
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  isPrivate: boolean;
  fillWithBots: boolean;
  botDifficulty: BotDifficulty;
};

export type CreateTableRequest = {
  config: TableConfig;
  buyIn: number;
};

export type JoinTableRequest = {
  tableId?: string;
  code?: string;
  buyIn: number;
};

export type LobbyTableSummary = {
  id: string;
  code: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  humanPlayers: number;
  occupiedSeats: number;
  isPrivate: boolean;
  phase: GameState['phase'] | 'LOBBY';
  hostUsername: string;
};

export type LobbySnapshot = {
  tables: LobbyTableSummary[];
  presence: PresencePlayer[];
};

export type PresencePlayer = {
  id: string;
  username: string;
  online: boolean;
  tableId: string | null;
  tableCode: string | null;
  lastSeenAt: number;
};

export type ChatMessage = {
  id: string;
  tableId: string;
  playerId: string;
  username: string;
  text: string;
  kind: 'PLAYER' | 'BOT' | 'SYSTEM' | 'COACH';
  createdAt: number;
};

export type HandHistoryRecord = {
  id: string;
  tableId: string;
  handNumber: number;
  players: Array<Pick<Player, 'id' | 'name' | 'position'> & {
    stackBefore: number;
    stackAfter: number;
  }>;
  holeCards: Record<string, [Card, Card]>;
  streets: Array<{
    street: Street;
    communityCards: Card[];
    actions: PlayerAction[];
    potAfter: number;
  }>;
  pots: Pot[];
  winners: WinnerResult[];
  createdAt: number;
};

export type ClientToServerMessage =
  | ({ type: 'AUTH' } & AuthRequest)
  | ({ type: 'CREATE_TABLE' } & CreateTableRequest)
  | ({ type: 'JOIN_TABLE' } & JoinTableRequest)
  | { type: 'LEAVE_TABLE' }
  | { type: 'START_TABLE' }
  | { type: 'ACTION'; action: ActionType; amount?: number }
  | { type: 'CHAT'; text: string }
  | { type: 'SET_BOT_FILL'; enabled: boolean };

export type ServerToClientMessage =
  | ({ type: 'AUTH_OK' } & AuthResponse)
  | { type: 'AUTH_ERROR'; message: string }
  | ({ type: 'LOBBY_STATE' } & LobbySnapshot)
  | { type: 'TABLE_STATE'; table: LobbyTableSummary; state: PublicGameState | null; messages: ChatMessage[]; heroPlayerId: string }
  | { type: 'TABLE_CLOSED'; tableId: string; reason: string }
  | { type: 'ERROR'; message: string };

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  name: 'River Room',
  smallBlind: 5,
  bigBlind: 10,
  minBuyIn: 500,
  maxBuyIn: 2000,
  maxPlayers: 6,
  isPrivate: false,
  fillWithBots: true,
  botDifficulty: 'INTERMEDIATE',
};

export function sanitizeTableConfig(config: Partial<TableConfig> = {}): TableConfig {
  const smallBlind = clampInteger(config.smallBlind, 1, 10000, DEFAULT_TABLE_CONFIG.smallBlind);
  const bigBlind = clampInteger(config.bigBlind, smallBlind * 2, 20000, Math.max(DEFAULT_TABLE_CONFIG.bigBlind, smallBlind * 2));
  const minBuyIn = clampInteger(config.minBuyIn, bigBlind * 20, 1_000_000, DEFAULT_TABLE_CONFIG.minBuyIn);
  const maxBuyIn = clampInteger(config.maxBuyIn, minBuyIn, 2_000_000, Math.max(DEFAULT_TABLE_CONFIG.maxBuyIn, minBuyIn));

  return {
    name: sanitizeTableName(config.name),
    smallBlind,
    bigBlind,
    minBuyIn,
    maxBuyIn,
    maxPlayers: clampInteger(config.maxPlayers, 2, 9, DEFAULT_TABLE_CONFIG.maxPlayers),
    isPrivate: config.isPrivate ?? DEFAULT_TABLE_CONFIG.isPrivate,
    fillWithBots: config.fillWithBots ?? DEFAULT_TABLE_CONFIG.fillWithBots,
    botDifficulty: config.botDifficulty ?? DEFAULT_TABLE_CONFIG.botDifficulty,
  };
}

export function clampBuyIn(config: TableConfig, buyIn: number): number {
  return clampInteger(buyIn, config.minBuyIn, config.maxBuyIn, config.minBuyIn);
}

export function createPublicGameState(input: {
  state: GameState;
  viewerId: string;
  players: PublicPlayerMeta[];
}): PublicGameState {
  const metadata = new Map(input.players.map((player) => [player.playerId, player]));
  const showdownIds = new Set(
    input.state.winners
      .filter((winner) => winner.showCards)
      .map((winner) => winner.playerId),
  );
  const players: PublicPlayer[] = input.state.players.map((player) => {
    const meta = metadata.get(player.id);
    const reveal = player.id === input.viewerId || (input.state.phase === 'HAND_COMPLETE' && showdownIds.has(player.id));

    return {
      ...player,
      holeCards: reveal ? player.holeCards : null,
      connected: meta?.connected ?? player.isBot,
      disconnectDeadline: meta?.disconnectDeadline ?? null,
      isHost: meta?.isHost ?? false,
    };
  });

  return {
    ...input.state,
    players,
    deckCount: input.state.deck.length,
  };
}

function sanitizeTableName(name: string | undefined): string {
  const trimmed = name?.trim().replace(/\s+/g, ' ').slice(0, 40);

  return trimmed || DEFAULT_TABLE_CONFIG.name;
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}
