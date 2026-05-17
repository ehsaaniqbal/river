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

export type PublicPlayer = Omit<Player, 'holeCards'> & {
  holeCards: [Card, Card] | null;
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
  players: Array<Pick<Player, 'id' | 'name' | 'position' | 'stack'>>;
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
  | { type: 'AUTH'; username: string; token?: string }
  | { type: 'CREATE_TABLE'; config: TableConfig; buyIn: number }
  | { type: 'JOIN_TABLE'; tableId?: string; code?: string; buyIn: number }
  | { type: 'LEAVE_TABLE' }
  | { type: 'START_TABLE' }
  | { type: 'ACTION'; action: ActionType; amount?: number }
  | { type: 'CHAT'; text: string }
  | { type: 'SET_BOT_FILL'; enabled: boolean };

export type ServerToClientMessage =
  | { type: 'AUTH_OK'; user: SessionUser; token: string }
  | { type: 'AUTH_ERROR'; message: string }
  | { type: 'LOBBY_STATE'; tables: LobbyTableSummary[]; presence: PresencePlayer[] }
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
