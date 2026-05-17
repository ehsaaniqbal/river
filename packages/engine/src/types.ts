// ─── Primitives ───────────────────────────────────────────────────────────────

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = typeof SUITS[number];

export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'] as const;
export type Rank = typeof RANKS[number];

export type Card = { rank: Rank; suit: Suit };

// Numeric rank for comparison: '2'=2 ... 'T'=10, 'J'=11, 'Q'=12, 'K'=13, 'A'=14
export const RANK_VALUE: Record<Rank, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14
};

// ─── Hand Evaluation ──────────────────────────────────────────────────────────

export const HAND_RANKS = [
  'HIGH_CARD','ONE_PAIR','TWO_PAIR','THREE_OF_A_KIND',
  'STRAIGHT','FLUSH','FULL_HOUSE','FOUR_OF_A_KIND','STRAIGHT_FLUSH','ROYAL_FLUSH'
] as const;
export type HandRank = typeof HAND_RANKS[number];
export const HAND_RANK_VALUE: Record<HandRank, number> = Object.fromEntries(
  HAND_RANKS.map((r, i) => [r, i])
) as Record<HandRank, number>;

export type HandResult = {
  rank: HandRank;
  // Best 5 cards, sorted descending by tiebreaker importance
  bestFive: [Card, Card, Card, Card, Card];
  // Tiebreaker array: compare element-by-element, higher wins
  // e.g. TWO_PAIR: [pairHighValue, pairLowValue, kickerValue]
  tiebreakers: number[];
};

// ─── Game Structure ───────────────────────────────────────────────────────────

export const POSITIONS = ['BTN','SB','BB','UTG','UTG+1','MP','LJ','HJ','CO'] as const;
export type Position = typeof POSITIONS[number];

export const STREETS = ['PREFLOP','FLOP','TURN','RIVER','SHOWDOWN'] as const;
export type Street = typeof STREETS[number];

export const ACTION_TYPES = ['FOLD','CHECK','CALL','BET','RAISE','ALL_IN'] as const;
export type ActionType = typeof ACTION_TYPES[number];

export type PlayerAction = {
  type: ActionType;
  amount: number; // 0 for FOLD/CHECK
  playerId: string;
  street: Street;
  timestamp: number;
};

export type Player = {
  id: string;
  name: string;
  stack: number;          // chips remaining
  holeCards: [Card, Card] | null;
  position: Position;
  seatIndex: number;       // 0–8
  isHuman: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  currentBet: number;     // amount bet this street
  totalInvested: number;  // total chips in pot this hand
  isBot: boolean;
  botDifficulty?: BotDifficulty;
};

export const BOT_DIFFICULTIES = ['BEGINNER','INTERMEDIATE','ADVANCED'] as const;
export type BotDifficulty = typeof BOT_DIFFICULTIES[number];

export type Pot = {
  amount: number;
  eligiblePlayerIds: string[]; // side pots: only players who contributed
};

export const GAME_PHASES = [
  'WAITING','POSTING_BLINDS','DEALING','PREFLOP',
  'FLOP','TURN','RIVER','SHOWDOWN','HAND_COMPLETE'
] as const;
export type GamePhase = typeof GAME_PHASES[number];

export type GameState = {
  phase: GamePhase;
  players: Player[];
  deck: Card[];
  communityCards: Card[];   // 0–5 cards
  pots: Pot[];              // index 0 = main pot
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  lastAggressorIndex: number;
  street: Street;
  actionHistory: PlayerAction[];
  handNumber: number;
  winners: WinnerResult[];
};

export type WinnerResult = {
  playerId: string;
  potIndex: number;
  amount: number;
  handResult: HandResult | null; // null if everyone else folded
  showCards: boolean;
};

// ─── Hand History ─────────────────────────────────────────────────────────────

export type StreetSnapshot = {
  street: Street;
  communityCards: Card[];
  actions: PlayerAction[];
  potAfter: number;
};

export type HandHistory = {
  handNumber: number;
  players: Pick<Player, 'id' | 'name' | 'position' | 'stack'>[];
  holeCards: Record<string, [Card, Card]>;
  streets: StreetSnapshot[];
  winners: WinnerResult[];
  timestamp: number;
};

// ─── Learning System ──────────────────────────────────────────────────────────

export type LessonId =
  | 'how-poker-works'
  | 'hand-rankings'
  | 'position'
  | 'pot-odds'
  | 'implied-odds'
  | 'starting-hands'
  | 'bet-sizing'
  | 'board-texture'
  | 'bluffing-basics'
  | 'bankroll-management'
  | 'reading-opponents'
  | 'common-mistakes';

export type LessonProgress = {
  lessonId: LessonId;
  completed: boolean;
  quizScore: number | null; // 0–100
  completedAt: number | null;
};

export type PlayerStats = {
  handsPlayed: number;
  handsWon: number;
  totalProfit: number;
  vpip: number;   // voluntarily put $ in pot %
  pfr: number;    // preflop raise %
  pokerIQ: number; // 0–1000, increases with good decisions
  sessionActions: { good: number; neutral: number; bad: number };
};

// ─── Coaching ─────────────────────────────────────────────────────────────────

export type CoachingAdvice = {
  quality: 'GOOD' | 'NEUTRAL' | 'BAD';
  recommendedAction: ActionType;
  explanation: string;        // 1–2 sentences max
  potOdds?: number;           // percentage, if relevant
  equity?: number;            // approximate hand equity %
};
