> Read this entire document before writing a single line of code.
> Do not deviate from the data structures, algorithms, or file layout defined here.
> Every decision that can be made in advance has been made here. Make no architectural choices that contradict this spec.

Project name: River
App title displayed in UI: River
Favicon: a simple river wave or card suit in gold (#C9A84C) on dark green (#0D1F17)
---

## 0. BUILD ORDER — FOLLOW THIS EXACTLY

1. `/src/types/poker.ts` — all shared types (defined below, copy verbatim)
2. `/src/lib/poker-engine/` — pure logic, zero React, fully tested
3. `/src/lib/ai-bot/` — bot strategy, depends only on poker-engine types
4. `/src/stores/` — Zustand game store wired to engine
5. `/src/components/game/` — table UI wired to store
6. `/src/components/learning/` — lesson system
7. `/src/app/` — pages + routing

Do not start step N+1 until step N compiles and its tests pass.

---

## 1. STACK — NO SUBSTITUTIONS

| Concern         | Choice                                            |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 15 (App Router)                           |
| Language        | TypeScript 5.x, `strict: true`, zero `any`        |
| UI primitives   | shadcn/ui (latest, `pnpm dlx shadcn@latest init`) |
| Styling         | Tailwind CSS v4                                   |
| Animation       | Framer Motion 11                                  |
| State           | Zustand 5 + immer middleware                      |
| Testing         | Vitest + @testing-library/react                   |
| Package manager | pnpm                                              |

`tsconfig.json` must have `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.

---

## 2. COMPLETE TYPE DEFINITIONS

Copy these into `/src/types/poker.ts` exactly. Do not rename or restructure.

```typescript
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

export const POSITIONS = ['BTN','SB','BB','UTG','UTG+1','HJ','CO'] as const;
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
  | 'hand-rankings'
  | 'position'
  | 'pot-odds'
  | 'starting-hands'
  | 'bet-sizing'
  | 'board-texture'
  | 'bluffing-basics'
  | 'bankroll-management';

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
```

---

## 3. POKER ENGINE — `/src/lib/poker-engine/`

### 3a. `deck.ts`

```typescript
// Fisher-Yates shuffle. Returns new array, never mutates.
export function createDeck(): Card[]
export function shuffleDeck(deck: Card[]): Card[]
export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] }
```

### 3b. `hand-evaluator.ts`

**Algorithm: 7-card exhaustive combination evaluator.**

Given 7 cards (2 hole + 5 community), evaluate all C(7,5)=21 combinations of 5 cards, score each, return the best.

Implement `score5(cards: [Card,Card,Card,Card,Card]): number` that returns a single 32-bit integer where higher = better. Encoding:

```
bits 28-24: HAND_RANK_VALUE (0–9)
bits 23-00: tiebreaker (packed rank values, primary in high bits)
```

Tiebreaker packing per hand type:
- `ROYAL_FLUSH`: 0 (all equal)
- `STRAIGHT_FLUSH`: high card rank value in bits 4–0
- `FOUR_OF_A_KIND`: (quad rank << 5) | kicker rank
- `FULL_HOUSE`: (trip rank << 5) | pair rank
- `FLUSH`: pack 5 card ranks, each 4 bits, highest first
- `STRAIGHT`: high card rank value
- `THREE_OF_A_KIND`: (trip rank << 10) | (k1 << 5) | k2
- `TWO_PAIR`: (highPair << 10) | (lowPair << 5) | kicker
- `ONE_PAIR`: (pair rank << 15) | (k1 << 10) | (k2 << 5) | k3
- `HIGH_CARD`: pack 5 ranks, each 4 bits, highest first

```typescript
export function evaluateBestHand(holeCards: [Card, Card], communityCards: Card[]): HandResult
// communityCards.length must be 3, 4, or 5. Throw if not.

export function compareHands(a: HandResult, b: HandResult): 1 | 0 | -1
// 1 = a wins, -1 = b wins, 0 = tie (split pot)

export function getHandDescription(result: HandResult): string
// Human-readable: "Aces full of Kings", "Jack-high Flush", "Pair of Sevens"
```

Write tests in `hand-evaluator.test.ts` for:
- Royal flush beats straight flush
- Straight flush beats four of a kind
- Full house beats flush
- Correct kicker resolution for one pair (A-A-K-Q-J beats A-A-K-Q-T)
- Wheel straight (A-2-3-4-5) is correctly scored below 6-high straight
- Split pot detected (identical hand scores)
- Flush over straight when cards allow both

### 3c. `pot-calculator.ts`

```typescript
// Compute main pot and all side pots from player investments.
// Side pots arise when a player is all-in for less than the max bet.
export function calculatePots(players: Player[]): Pot[]
```

Algorithm:
1. Sort players by `totalInvested` ascending.
2. For each all-in player at level L: create a pot capped at L × N (N = players who invested ≥ L), remove L from each eligible player's investment.
3. Remaining investments form the next pot, excluding players whose investment was exhausted.

Write tests for:
- 3-way all-in at different stack depths produces correct side pots
- Folded players contribute to pots they created but are ineligible to win
- Single all-in creates main pot + side pot correctly

### 3d. `game-engine.ts`

This is the core state machine. It is a **pure function module**: all functions take `GameState` and return a new `GameState`. They never mutate.

```typescript
// Initialize a fresh hand given players and blinds. Shuffles deck, deals hole cards,
// posts blinds, sets phase to PREFLOP. Rotates dealer button.
export function initHand(players: Player[], dealerIndex: number, blinds: { small: number; big: number }): GameState

// Apply a player action to state. Returns new state. Throws if action is illegal.
// Handles: FOLD, CHECK, CALL, BET, RAISE, ALL_IN
// After action: advances currentPlayerIndex, detects end-of-street, advances street.
export function applyAction(state: GameState, action: PlayerAction): GameState

// Deal the next community cards. FLOP=3 cards, TURN=1, RIVER=1. Returns new state.
export function dealStreet(state: GameState): GameState

// Run showdown: compare all non-folded hands, award pots. Returns state with phase=HAND_COMPLETE and winners populated.
export function runShowdown(state: GameState): GameState

// Returns legal actions for the current player.
export type LegalActions = {
  canCheck: boolean;
  canCall: boolean; callAmount: number;
  canBet: boolean; minBet: number; maxBet: number;
  canRaise: boolean; minRaise: number; maxRaise: number;
  canFold: boolean;
  isAllIn: boolean; allInAmount: number;
};
export function getLegalActions(state: GameState): LegalActions

// Returns true if only one player remains (all others folded)
export function isHandOver(state: GameState): boolean
```

End-of-street detection logic:
- Street ends when: every active (non-folded, non-all-in) player has acted AND all current bets are equal.
- Special case PREFLOP: BB gets an option to raise even if everyone just calls.
- If only 0 or 1 non-all-in players remain, run out remaining streets immediately without betting.

Write tests for:
- BB option (everyone calls, BB can still raise)
- All-in run-out (deal remaining streets with no betting)
- Illegal action throws (check when there's a bet, raise below min-raise)
- Hand ends immediately when all but one player fold

---

## 4. BOT ENGINE — `/src/lib/ai-bot/`

### 4a. `hand-ranges.ts`

Define preflop hand ranges as `Set<string>` where string = canonical hand notation.

Notation: `'AKs'` (suited), `'AKo'` (offsuit), `'AA'` (pair).

```typescript
// Returns canonical notation for two hole cards
export function toHandNotation(cards: [Card, Card]): string

// Returns true if hand is in the given range
export function isInRange(cards: [Card, Card], range: Set<string>): boolean

// Prebuilt ranges per bot and position
export const RANGES: Record<BotDifficulty, Record<Position, Set<string>>>
```

Define the ranges:

**BEGINNER (Fish Freddy) — plays ~55% of hands from any position:**
Include: all pairs, all suited aces (A2s+), all suited connectors (54s+), all broadway hands (any two T+), all offsuit aces (A2o+), KJo+, QJo+, and many weak hands.

**INTERMEDIATE (TAG Terry) — plays ~22% of hands, tighter from early position:**
- UTG: 88+, ATs+, AQo+, KQs
- HJ: 77+, A9s+, AJo+, KQs, KJs, QJs
- CO: 66+, A7s+, ATo+, KJs+, KQo, QJs, JTs
- BTN: 44+, A4s+, A8o+, KTs+, KJo+, QTs+, JTs, T9s
- SB: same as CO
- BB: defend vs BTN with 55+, A2s+, A7o+, K9s+, QTs+, JTo+, T9o

**ADVANCED (GTO Gary) — plays ~28% of hands with mixed strategies:**
Use the same ranges as INTERMEDIATE but add mixed-strategy hands in BTN/CO/SB (random 50% inclusion of borderline hands). Advanced bot also calls 3-bets and 4-bets with wider continuing ranges.

### 4b. `bot-strategy.ts`

```typescript
// Main entry point. Returns the bot's chosen action.
// Adds simulated think delay via returned thinkMs field.
export type BotDecision = {
  action: ActionType;
  amount: number;      // 0 for FOLD/CHECK
  thinkMs: number;     // delay before executing, milliseconds
};

export function getBotDecision(
  state: GameState,
  botPlayer: Player,
  legal: LegalActions
): BotDecision
```

#### Decision pipeline per difficulty:

**BEGINNER:**
```
1. If not in range → fold 60% / call 40% (fish leaks)
2. If in range:
   - Top 10% hands (AA,KK,QQ,AKs): raise pot
   - Strong hands (JJ,TT,AQs+,KQs): raise 3x BB
   - Everything else: call
3. Postflop:
   - Top pair or better → bet 50% pot
   - Any pair → check/call
   - No pair → check/fold (calls if pot odds > 40%)
thinkMs: random 300–800ms
```

**INTERMEDIATE:**
```
1. Preflop: use INTERMEDIATE range, position-aware
2. Raise 3x BB with 15% of range; call 50%; fold rest
3. 3-bet with TT+, AQs+, KQs
4. Postflop equity calculation (see below):
   - Equity > 70%: value bet 75% pot
   - Equity 50–70%: bet 50% pot
   - Equity 30–50%: check/call if pot odds > equity
   - Equity < 30%: check/fold (bluff 20% of time if in position)
thinkMs: random 600–1400ms
```

**ADVANCED:**
```
1. Preflop: use ADVANCED range with mixed strategy
2. Randomize bet sizing: 33% / 50% / 75% / pot (each 25% probability on value)
3. Include bluff combos: gutshots, backdoor flush draws with good blockers
4. Apply pot odds check: continue if equity > required_equity (pot odds formula)
5. 3-bet bluff 30% of time with bluff-catching blockers (Ax suited)
6. Fold to 4-bet with < 10% of range
thinkMs: random 800–2000ms (simulates deeper thought)
```

#### Postflop equity approximation (no Monte Carlo, deterministic):

```typescript
function approximateEquity(holeCards: [Card, Card], communityCards: Card[], activePlayers: number): number
```

Use the **Rule of 2 and 4**:
1. Count outs (cards that improve hand to likely winner).
2. If one card to come: equity ≈ outs × 2 / 100.
3. If two cards to come: equity ≈ outs × 4 / 100.
4. Cap at 0.95.

Out counting heuristics (implement these exactly):
- Open-ended straight draw: 8 outs
- Flush draw: 9 outs
- Gutshot straight draw: 4 outs
- Two overcards: 6 outs
- One overcard: 3 outs
- Set vs likely overpair/two-pair: 10 outs (full house outs)
- If already have best hand (top pair top kicker+): 0 outs needed, equity = 0.75 base

Divide raw equity by `activePlayers - 1` when more than 2 players active (multi-way equity is lower).

---

## 5. ZUSTAND STORE — `/src/stores/gameStore.ts`

```typescript
type GameStore = {
  // State
  gameState: GameState | null;
  handHistory: HandHistory[];
  lessonProgress: LessonProgress[];
  playerStats: PlayerStats;
  coachingEnabled: boolean;
  lastCoachingAdvice: CoachingAdvice | null;
  isAnimating: boolean;    // true while card deal / chip animations play

  // Actions
  initGame: (config: { numBots: number; difficulty: BotDifficulty; startingStack: number; blinds: { small: number; big: number } }) => void;
  executeAction: (action: ActionType, amount?: number) => Promise<void>;
  nextHand: () => void;
  toggleCoaching: () => void;
  completeLesson: (lessonId: LessonId, quizScore: number) => void;
  resetStats: () => void;
};
```

`executeAction` flow:
1. Validate action is legal via `getLegalActions`.
2. Generate `CoachingAdvice` if `coachingEnabled` (call coaching evaluator — see section 7).
3. Apply action via `applyAction`.
4. If hand is over (`isHandOver`), run `runShowdown`.
5. Else if street is complete, call `dealStreet`.
6. If active player is a bot after state update: schedule bot decision with `thinkMs` delay, then call `executeAction` recursively.
7. Persist `handHistory` and `playerStats` to `localStorage` key `'poker-app-v1'`.

---

## 6. FILE STRUCTURE

```
/
├── src/
│   ├── types/
│   │   └── poker.ts                  ← Section 2 types, verbatim
│   ├── lib/
│   │   ├── poker-engine/
│   │   │   ├── deck.ts
│   │   │   ├── hand-evaluator.ts
│   │   │   ├── hand-evaluator.test.ts
│   │   │   ├── pot-calculator.ts
│   │   │   ├── pot-calculator.test.ts
│   │   │   └── game-engine.ts
│   │   │   └── game-engine.test.ts
│   │   ├── ai-bot/
│   │   │   ├── hand-ranges.ts
│   │   │   └── bot-strategy.ts
│   │   └── coaching/
│   │       └── coaching-evaluator.ts ← Section 7
│   ├── stores/
│   │   └── gameStore.ts
│   ├── hooks/
│   │   ├── useGameState.ts           ← selector hooks wrapping store
│   │   ├── useLegalActions.ts
│   │   └── useCoaching.ts
│   ├── components/
│   │   ├── ui/                       ← shadcn, never edit directly
│   │   ├── game/
│   │   │   ├── GameTable.tsx         ← root table layout
│   │   │   ├── PlayingCard.tsx       ← face/back, flip animation
│   │   │   ├── CardHand.tsx          ← renders 2 hole cards
│   │   │   ├── CommunityCards.tsx    ← board with per-card reveal
│   │   │   ├── PlayerSeat.tsx        ← avatar, name, stack, action badge
│   │   │   ├── ChipStack.tsx         ← visual chip representation
│   │   │   ├── PotDisplay.tsx        ← main + side pots
│   │   │   ├── ActionButtons.tsx     ← fold/check/call/bet + raise slider
│   │   │   ├── BetSlider.tsx         ← shadcn Slider, min/max from LegalActions
│   │   │   ├── HandStrengthMeter.tsx ← relative strength bar (human only)
│   │   │   └── WinnerOverlay.tsx     ← showdown reveal + pot award
│   │   ├── learning/
│   │   │   ├── LessonHub.tsx
│   │   │   ├── LessonCard.tsx
│   │   │   ├── HandRankingsLesson.tsx
│   │   │   ├── PositionLesson.tsx
│   │   │   ├── PotOddsLesson.tsx
│   │   │   ├── StartingHandsLesson.tsx
│   │   │   ├── BetSizingLesson.tsx
│   │   │   ├── BoardTextureLesson.tsx
│   │   │   ├── BluffingLesson.tsx
│   │   │   └── BankrollLesson.tsx
│   │   └── coaching/
│   │       └── CoachingCard.tsx      ← dismissible hint, bottom of table
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  ← lobby / home
│   │   ├── play/
│   │   │   └── page.tsx              ← game table
│   │   ├── learn/
│   │   │   ├── page.tsx              ← lesson hub
│   │   │   └── [lessonId]/
│   │   │       └── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx              ← hand history
│   │   └── stats/
│   │       └── page.tsx              ← stats dashboard
│   └── constants/
│       ├── ranges.ts                 ← re-exports from hand-ranges.ts
│       └── lessons.ts                ← lesson metadata (title, description, order)
├── vitest.config.ts
├── tailwind.config.ts
└── components.json                   ← shadcn config
```

---

## 7. COACHING EVALUATOR — `/src/lib/coaching/coaching-evaluator.ts`

```typescript
export function evaluateAction(
  state: GameState,
  action: ActionType,
  amount: number,
  humanPlayer: Player,
  legal: LegalActions
): CoachingAdvice
```

Rules (implement in this order, first match wins):

| Situation                           | Human Action  | Quality | Explanation template                                                                                         |
| ----------------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Pot odds > equity by >10%           | CALL or RAISE | BAD     | "Calling here costs you {potOdds}% but you only have ~{equity}% equity. This is a losing call long-term."    |
| Pot odds < equity by >15%           | FOLD          | BAD     | "You're folding with ~{equity}% equity when the pot is offering you {potOdds}%. This was a profitable call." |
| Top pair+ (postflop), no bet made   | CHECK         | NEUTRAL | "With a strong hand you can bet for value — around 50–75% of the pot is standard here."                      |
| Bluffing into 3+ players            | BET or RAISE  | BAD     | "Bluffing into multiple opponents rarely works — someone usually has something."                             |
| In position, checked to             | CHECK         | NEUTRAL | "You could take a stab at this pot in position. A bet of ⅓ pot applies pressure."                            |
| Raising for value in position       | BET or RAISE  | GOOD    | "Nice value bet. Extracting chips when ahead is the foundation of winning poker."                            |
| Folding correct (equity < pot odds) | FOLD          | GOOD    | "Good laydown. You were getting {potOdds}% from the pot but only had ~{equity}% equity."                     |
| Calling with draws correctly        | CALL          | GOOD    | "Good call. Your draw has ~{equity}% equity and the pot is offering {potOdds}% — this is profitable."        |
| Default (no rule matched)           | any           | NEUTRAL | "Reasonable play. Keep paying attention to pot odds and position."                                           |

Pot odds formula: `potOdds = callAmount / (pot + callAmount) * 100`

---

## 8. UI — COMPONENT SPECS

### Visual Design System

**Color palette (apply via Tailwind + CSS variables):**
```css
--felt: #1B3D2F;
--felt-light: #24513E;
--card-bg: #FAFAF7;
--chip-gold: #C9A84C;
--chip-red: #C0392B;
--chip-blue: #2980B9;
--table-border: #0D2318;
--text-primary: #F5F0E8;
--text-muted: #8BA898;
--accent: #E8C96A; /* gold accent for winner highlights */
```

**Typography:** Import `Playfair Display` (display/headings) + `DM Mono` (stack sizes, chip counts) from Google Fonts.

**Background:** Full-page dark `#0D1F17`. Table surface is an ellipse with `--felt` fill + radial gradient to `--felt-light` at center. Subtle `background-image: repeating-linear-gradient(...)` felt texture.

### `PlayingCard.tsx`

Props:
```typescript
type PlayingCardProps = {
  card: Card | null;  // null = face-down
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;  // Framer Motion flip animation
};
```

- `sm`: 40×56px, `md`: 64×90px, `lg`: 80×112px
- Face-up: white card with rank+suit in top-left, large suit in center. Red for hearts/diamonds, black for clubs/spades.
- Face-down: dark green with a pattern (CSS repeating-linear-gradient diamond pattern).
- Animate with Framer Motion `rotateY` from 90→0 on mount when `animate=true`.

### `PlayerSeat.tsx`

Seats are absolutely positioned around the table. For N players, compute seat positions as points on an ellipse:

```typescript
// Table ellipse center: (50%, 50%), rx=42%, ry=38%
function seatPosition(seatIndex: number, totalSeats: number): { x: number; y: number }
// Returns percentage values for top/left CSS positioning
// Seat 0 (hero) always at bottom center (x=50%, y=88%)
// Remaining seats distributed clockwise
```

Display: avatar circle (initials), name, stack size, action badge (`FOLD`/`ALL-IN`/`CHECK`/bet amount).

Action badge uses Framer Motion `AnimatePresence` to slide in, hold 1.5s, fade out.

### `ActionButtons.tsx`

Render only when `gameState.currentPlayer.isHuman === true`.

Layout: Three always-visible buttons (Fold, Check/Call, Bet/Raise) + collapsible `BetSlider`.

- **Fold**: always available when human is active. `bg-red-900 hover:bg-red-800`
- **Check**: shown when `legal.canCheck`. **Call {amount}**: shown when `legal.canCall`. `bg-slate-700 hover:bg-slate-600`
- **Bet / Raise**: shown when `legal.canBet || legal.canRaise`. Opens slider. `bg-amber-600 hover:bg-amber-500`

`BetSlider`: shadcn `<Slider>` with `min={legal.minBet}` `max={legal.maxBet}` `step={state.bigBlind}`. Show quick-select buttons: `½ Pot`, `¾ Pot`, `Pot`, `All-In`.

### `CommunityCards.tsx`

5 card slots always shown. Hidden cards show empty placeholder (dashed border, same card dimensions). Cards animate in with a 100ms stagger between each card on street deal.

### `WinnerOverlay.tsx`

On `HAND_COMPLETE` phase:
1. Reveal all non-folded players' hole cards with flip animation (staggered 200ms apart).
2. Highlight winning hand cards with `--accent` glow.
3. Animate chips sweeping toward winner seat (Framer Motion `animate` on a chip SVG).
4. Show `HandResult.rank` description prominently.
5. Auto-dismiss after 3 seconds, or on click.

### `CoachingCard.tsx`

Fixed to bottom of table (above action buttons). Slides up with Framer Motion when advice is available.

```typescript
type CoachingCardProps = {
  advice: CoachingAdvice;
  onDismiss: () => void;
};
```

Quality colors: `GOOD`=green border, `NEUTRAL`=blue border, `BAD`=red border. Show recommended action, explanation, and pot odds / equity if present.

---

## 9. LEARNING SYSTEM

### Lesson structure

Each lesson is a self-contained Next.js page at `/learn/[lessonId]`. Every lesson has three sections rendered as tabs (shadcn `<Tabs>`):

1. **Learn** — explanation with diagrams/interactive elements
2. **Practice** — 3–5 scenario questions (multiple choice with feedback)
3. **Quiz** — 5 questions, scored, saves to `lessonProgress`

Quiz score ≥ 70 marks lesson complete. Score is saved via `completeLesson` store action.

### Lesson content requirements

**`hand-rankings`:**
- Interactive: display 9 hand types, user drags to rank them (React DnD or pointer events).
- On submit: reveal correct ranking with animation. Highlight errors.

**`position`:**
- Interactive: table diagram with all seats labeled. Click any seat → tooltip explains BTN/SB/BB/UTG/HJ/CO/UTG+1 advantage/disadvantage.
- Key lesson: "The button acts last on every postflop street — this is the most valuable seat."

**`pot-odds`:**
- Interactive calculator: sliders for pot size, call amount, number of outs.
- Show: pot odds %, equity %, and a GO/NO-GO indicator.
- Formula displayed: `Pot Odds = call / (pot + call)`, `Equity = outs × 2 (one card) or × 4 (two cards)`.

**`starting-hands`:**
- Show a 13×13 starting hand matrix (Sklansky-style grid).
- Color cells by range tier: Premium / Strong / Playable / Marginal / Fold.
- Dropdown to switch between positions and see how range widens on BTN vs UTG.

**`bet-sizing`:**
- Interactive: slider sets bet size relative to pot. Show opponent pot odds at each bet size. Illustrate why 10% pot bets give opponents infinite odds (always call) and why overbets fold equity.

**`board-texture`:**
- Show example boards (3 community cards). User classifies: Wet/Dry, Paired/Unpaired, Monotone/Rainbow.
- Explain: wet boards = more draws = more caution.

**`bluffing-basics`:**
- Teach fold equity: "A bluff only needs to work `callAmount / (pot + callAmount)` of the time to break even."
- Interactive: enter pot, bluff size, estimated fold % → shows EV of bluff.

**`bankroll-management`:**
- Static content: NL cash = 20 buy-ins minimum. Tournament = 50 buy-ins. Explain variance.
- Interactive: variance simulator (binomial distribution, show sample paths).

---

## 10. STATS DASHBOARD — `/app/stats/page.tsx`

Use `recharts` for all charts. All charts respect Tailwind dark mode.

Charts to implement:

```typescript
// 1. Win Rate Over Time — LineChart
// x: hand number, y: cumulative profit in BB

// 2. VPIP & PFR — Two horizontal BarCharts side by side
// Target ranges shown as reference lines: VPIP 15-25%, PFR 12-20%

// 3. Action Distribution — PieChart
// Slices: Fold / Call / Raise

// 4. Poker IQ Progress — AreaChart
// x: session, y: IQ score
```

Stat cards (top of page): Hands Played, Total Profit (BB), Win Rate %, Poker IQ.

---

## 11. HAND HISTORY — `/app/history/page.tsx`

List all recorded hands, newest first. Each row: hand number, date, position, result (Won/Lost + amount), winning hand.

Click a hand → opens a modal with street-by-street replay:
- Navigation: Prev / Next street buttons.
- Each street shows: community cards dealt that street, actions taken (as a log), pot size after street.
- Shows all hole cards at showdown.
- Rendered using the same `PlayingCard` and `CommunityCards` components used in the game.

---

## 12. LOBBY — `/app/page.tsx`

Three cards (shadcn `<Card>`):
1. **Learn Poker** → `/learn` — shows lesson completion count (e.g. "3/8 complete")
2. **Practice vs Bots** → config modal → `/play`
3. **My Stats** → `/stats`

Config modal (shadcn `<Dialog>`) fields:
- Number of bots: 1–3 (shadcn `<Select>`)
- Bot difficulty: Beginner / Intermediate / Advanced (shadcn `<RadioGroup>`)
- Starting stack: 500 / 1000 / 2000 chips (shadcn `<Select>`)
- Coaching mode: on/off toggle (shadcn `<Switch>`)
- Blinds: 5/10, 10/20, 25/50 (shadcn `<Select>`)

---

## 13. PERFORMANCE REQUIREMENTS

- Memoize `evaluateBestHand` calls: `const cache = new Map<string, HandResult>()` keyed by sorted card strings (e.g. `'Ah-Kh-Qh-Jh-Th-9h-8h'`). Cache lives for the session.
- Use `React.memo` on: `PlayingCard`, `PlayerSeat`, `ChipStack`, `PotDisplay`.
- Use `useCallback` on all event handlers passed as props.
- Bot decision computation runs in `setTimeout(..., thinkMs)` — never blocks the main thread.
- `HandHistory` list virtualizes with `@tanstack/react-virtual` when `handHistory.length > 50`.
- All Framer Motion animations use `will-change: transform` and `translateZ(0)`.

---

## 14. EDGE CASES — HANDLE ALL OF THESE

- **Split pot**: two players with identical best 5-card hand → split pot evenly (odd chip goes to first player left of dealer).
- **All-in run-out**: if all remaining players are all-in, deal all remaining streets immediately, then showdown. No action buttons shown.
- **Heads-up blinds rule**: in heads-up (2 players), dealer posts small blind and acts first preflop; BB acts first postflop. Adjust `initHand` accordingly.
- **Short stack all-in**: player with fewer chips than the call amount goes all-in for their remaining stack. Creates a side pot.
- **Last aggressor shows first**: at showdown, the player who made the last aggressive action on the river shows first. Others may muck if beaten.
- **Minimum raise**: re-raise must be at least the size of the previous raise. Track `minRaise` in `GameState`.
- **Dead blinds**: if a player folds their blind, dead chips still go in the pot and are not returned.

---

## 15. ACCESSIBILITY

- All `PlayingCard` components: `aria-label="Ace of Spades"` (or "Face-down card").
- Action buttons: `aria-label` on each.
- Keyboard navigation: Tab through Fold/Check/Call/Bet, Enter to confirm.
- Chip and pot amounts: use `aria-live="polite"` region that announces pot size changes.
- Lesson quizzes: `<fieldset>` + `<legend>` wrapping each question.

---

## 16. INITIALIZATION COMMANDS

Run these in order to bootstrap:

```bash
pnpm create next-app@latest poker-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd poker-app
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add card button dialog select radio-group switch slider tabs progress badge
pnpm add zustand immer framer-motion recharts @tanstack/react-virtual
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

---

## 17. WHAT NOT TO DO

- Do NOT use a third-party poker library. Implement the engine from scratch per this spec.
- Do NOT use `any` or `as unknown as X`.
- Do NOT store mutable state in React component state when it belongs in the Zustand store.
- Do NOT render action buttons when it is a bot's turn.
- Do NOT skip the tests. The engine must be verified before the UI is built.
- Do NOT use `useEffect` to sync Zustand state — use store subscriptions or selectors.
- Do NOT use `localStorage` directly — wrap it in a store middleware (Zustand `persist`).
- Do NOT deploy without testing the side-pot scenario with 3 players of unequal stacks.
