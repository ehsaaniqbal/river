import { RANK_VALUE, type ActionType, type Card, type GameState, type Player, type Position } from '@river/engine';
import type { LegalActions } from '@river/engine';
import { evaluateBestHand } from '@river/engine';
import { ADVANCED_MIXED_HANDS, RANGES, toHandNotation } from './hand-ranges';

export type BotDecision = {
  action: ActionType;
  amount: number;
  thinkMs: number;
};

type DrawProfile = {
  flushDraw: boolean;
  openEndedStraightDraw: boolean;
  gutshotStraightDraw: boolean;
  overcards: number;
  hasSet: boolean;
  topPairTopKickerOrBetter: boolean;
  anyPair: boolean;
};

const topTenHands = new Set(['AA', 'KK', 'QQ', 'AKs']);
const beginnerStrongHands = new Set(['JJ', 'TT', 'AQs', 'AKs', 'AQo', 'KQs']);
const intermediateRaiseHands = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', 'AKs', 'AQs', 'AJs', 'AKo', 'AQo', 'KQs']);
const threeBetHands = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo', 'KQs']);
const fourBetContinueHands = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function potSize(state: GameState): number {
  return state.players.reduce((total, player) => total + player.totalInvested, 0);
}

function activePlayers(state: GameState): number {
  return state.players.filter((player) => !player.isFolded).length;
}

function hasFacingBet(player: Player, state: GameState): boolean {
  const currentHigh = Math.max(...state.players.map((seat) => seat.currentBet));

  return currentHigh > player.currentBet;
}

function hasPriorRaise(state: GameState): boolean {
  return state.actionHistory.some((action) => action.street === state.street && (action.type === 'RAISE' || action.type === 'ALL_IN'));
}

function clampBet(amount: number, legal: LegalActions): number {
  if (legal.canBet) {
    return Math.min(Math.max(amount, legal.minBet), legal.maxBet);
  }

  if (legal.canRaise) {
    return Math.min(Math.max(amount, legal.minRaise), legal.maxRaise);
  }

  return legal.allInAmount;
}

function fallbackDecision(legal: LegalActions, thinkMs: number): BotDecision {
  if (legal.canCheck) {
    return { action: 'CHECK', amount: 0, thinkMs };
  }

  if (legal.canCall) {
    return { action: 'CALL', amount: legal.callAmount, thinkMs };
  }

  if (legal.canFold) {
    return { action: 'FOLD', amount: 0, thinkMs };
  }

  return { action: 'CHECK', amount: 0, thinkMs };
}

function foldOrCheck(legal: LegalActions, thinkMs: number): BotDecision {
  if (legal.canCheck) {
    return { action: 'CHECK', amount: 0, thinkMs };
  }

  return { action: 'FOLD', amount: 0, thinkMs };
}

function callOrCheck(legal: LegalActions, thinkMs: number): BotDecision {
  if (legal.canCall) {
    return { action: 'CALL', amount: legal.callAmount, thinkMs };
  }

  if (legal.canCheck) {
    return { action: 'CHECK', amount: 0, thinkMs };
  }

  return fallbackDecision(legal, thinkMs);
}

function betOrRaise(amount: number, legal: LegalActions, thinkMs: number): BotDecision {
  if (legal.canRaise) {
    return { action: 'RAISE', amount: clampBet(amount, legal), thinkMs };
  }

  if (legal.canBet) {
    return { action: 'BET', amount: clampBet(amount, legal), thinkMs };
  }

  return callOrCheck(legal, thinkMs);
}

function allInOrFallback(legal: LegalActions, thinkMs: number): BotDecision {
  if (legal.isAllIn) {
    return { action: 'ALL_IN', amount: legal.allInAmount, thinkMs };
  }

  return fallbackDecision(legal, thinkMs);
}

function isAdvancedMixedHand(position: Position, notation: string): boolean {
  if (position !== 'BTN' && position !== 'CO' && position !== 'SB') {
    return false;
  }

  return ADVANCED_MIXED_HANDS[position].has(notation);
}

function shouldPlayPreflop(botPlayer: Player): boolean {
  if (!botPlayer.holeCards) {
    return false;
  }

  const range = RANGES[botPlayer.botDifficulty ?? 'BEGINNER'][botPlayer.position];
  const handNotation = toHandNotation(botPlayer.holeCards);

  if (!range.has(handNotation)) {
    return false;
  }

  if ((botPlayer.botDifficulty ?? 'BEGINNER') === 'ADVANCED' && isAdvancedMixedHand(botPlayer.position, handNotation)) {
    return Math.random() < 0.5;
  }

  return true;
}

function preflopDecision(state: GameState, botPlayer: Player, legal: LegalActions, thinkMs: number): BotDecision {
  if (!botPlayer.holeCards) {
    return fallbackDecision(legal, thinkMs);
  }

  const difficulty = botPlayer.botDifficulty ?? 'BEGINNER';
  const handNotation = toHandNotation(botPlayer.holeCards);
  const inRange = shouldPlayPreflop(botPlayer);
  const facingBet = hasFacingBet(botPlayer, state);
  const alreadyRaised = hasPriorRaise(state);

  if (difficulty === 'BEGINNER') {
    if (!inRange) {
      return Math.random() < 0.6 ? foldOrCheck(legal, thinkMs) : callOrCheck(legal, thinkMs);
    }

    if (topTenHands.has(handNotation)) {
      return betOrRaise(potSize(state), legal, thinkMs);
    }

    if (beginnerStrongHands.has(handNotation)) {
      return betOrRaise(state.bigBlind * 3, legal, thinkMs);
    }

    return callOrCheck(legal, thinkMs);
  }

  if (!inRange) {
    return foldOrCheck(legal, thinkMs);
  }

  if (alreadyRaised && !threeBetHands.has(handNotation)) {
    return difficulty === 'ADVANCED' && handNotation.endsWith('s') && handNotation.startsWith('A') && Math.random() < 0.3
      ? betOrRaise(Math.max(legal.minRaise, state.bigBlind * 9), legal, thinkMs)
      : foldOrCheck(legal, thinkMs);
  }

  if (alreadyRaised && difficulty === 'ADVANCED' && !fourBetContinueHands.has(handNotation) && Math.random() < 0.5) {
    return foldOrCheck(legal, thinkMs);
  }

  if (facingBet && threeBetHands.has(handNotation) && legal.canRaise) {
    return betOrRaise(Math.max(legal.minRaise, state.bigBlind * 9), legal, thinkMs);
  }

  if (intermediateRaiseHands.has(handNotation) && legal.canRaise) {
    return betOrRaise(Math.max(legal.minRaise, state.bigBlind * 3), legal, thinkMs);
  }

  if (!facingBet && intermediateRaiseHands.has(handNotation) && legal.canBet) {
    return betOrRaise(state.bigBlind * 3, legal, thinkMs);
  }

  return Math.random() < 0.5 ? callOrCheck(legal, thinkMs) : foldOrCheck(legal, thinkMs);
}

function rankValues(cards: Card[]): number[] {
  return cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
}

function uniqueRankValues(cards: Card[]): number[] {
  return [...new Set(rankValues(cards))].sort((a, b) => b - a);
}

function hasOpenEndedStraightDraw(cards: Card[]): boolean {
  const values = uniqueRankValues(cards);
  const aceLowValues = values.includes(14) ? [...values, 1] : values;

  for (let low = 1; low <= 10; low += 1) {
    const run = [low, low + 1, low + 2, low + 3];
    const present = run.every((value) => aceLowValues.includes(value));

    if (present && low > 1 && low + 4 <= 14) {
      return true;
    }
  }

  return false;
}

function hasGutshotStraightDraw(cards: Card[]): boolean {
  const values = uniqueRankValues(cards);
  const aceLowValues = values.includes(14) ? [...values, 1] : values;

  for (let low = 1; low <= 10; low += 1) {
    const run = [low, low + 1, low + 2, low + 3, low + 4];
    const presentCount = run.filter((value) => aceLowValues.includes(value)).length;

    if (presentCount === 4) {
      return true;
    }
  }

  return false;
}

function flushDraw(cards: Card[]): boolean {
  const suitCounts = cards.reduce<Record<Card['suit'], number>>((counts, card) => ({
    ...counts,
    [card.suit]: counts[card.suit] + 1,
  }), {
    clubs: 0,
    diamonds: 0,
    hearts: 0,
    spades: 0,
  });

  return Object.values(suitCounts).some((count) => count === 4);
}

function topPairTopKickerOrBetter(holeCards: [Card, Card], communityCards: Card[]): boolean {
  const hand = evaluateBestHand(holeCards, communityCards);

  if (hand.rank !== 'HIGH_CARD' && hand.rank !== 'ONE_PAIR') {
    return true;
  }

  if (hand.rank !== 'ONE_PAIR') {
    return false;
  }

  const topBoardRank = Math.max(...communityCards.map((card) => RANK_VALUE[card.rank]));
  const pairRank = hand.tiebreakers[0] ?? 0;
  const kicker = hand.tiebreakers[1] ?? 0;

  return pairRank === topBoardRank && kicker === 14;
}

function hasAnyPair(holeCards: [Card, Card], communityCards: Card[]): boolean {
  return evaluateBestHand(holeCards, communityCards).rank !== 'HIGH_CARD';
}

function hasSet(holeCards: [Card, Card], communityCards: Card[]): boolean {
  if (holeCards[0].rank !== holeCards[1].rank) {
    return false;
  }

  return communityCards.some((card) => card.rank === holeCards[0].rank);
}

function drawProfile(holeCards: [Card, Card], communityCards: Card[]): DrawProfile {
  const allCards = [...holeCards, ...communityCards];
  const boardHigh = Math.max(...communityCards.map((card) => RANK_VALUE[card.rank]));
  const overcards = holeCards.filter((card) => RANK_VALUE[card.rank] > boardHigh).length;

  return {
    flushDraw: flushDraw(allCards),
    openEndedStraightDraw: hasOpenEndedStraightDraw(allCards),
    gutshotStraightDraw: hasGutshotStraightDraw(allCards),
    overcards,
    hasSet: hasSet(holeCards, communityCards),
    topPairTopKickerOrBetter: topPairTopKickerOrBetter(holeCards, communityCards),
    anyPair: hasAnyPair(holeCards, communityCards),
  };
}

export function approximateEquity(holeCards: [Card, Card], communityCards: Card[], activePlayerCount: number): number {
  if (communityCards.length < 3) {
    return 0.5;
  }

  const profile = drawProfile(holeCards, communityCards);

  if (profile.topPairTopKickerOrBetter) {
    return activePlayerCount > 2 ? 0.75 / (activePlayerCount - 1) : 0.75;
  }

  let outs = 0;

  if (profile.openEndedStraightDraw) {
    outs += 8;
  } else if (profile.gutshotStraightDraw) {
    outs += 4;
  }

  if (profile.flushDraw) {
    outs += 9;
  }

  if (profile.overcards >= 2) {
    outs += 6;
  } else if (profile.overcards === 1) {
    outs += 3;
  }

  if (profile.hasSet) {
    outs += 10;
  }

  const multiplier = communityCards.length === 3 ? 4 : 2;
  const rawEquity = Math.min((outs * multiplier) / 100, 0.95);

  return activePlayerCount > 2 ? rawEquity / (activePlayerCount - 1) : rawEquity;
}

function requiredEquity(state: GameState, legal: LegalActions): number {
  if (!legal.canCall || legal.callAmount <= 0) {
    return 0;
  }

  return legal.callAmount / (potSize(state) + legal.callAmount);
}

function inPosition(state: GameState, botPlayer: Player): boolean {
  const active = state.players.filter((player) => !player.isFolded);
  const botIndex = active.findIndex((player) => player.id === botPlayer.id);

  return botIndex === active.length - 1;
}

function postflopDecision(state: GameState, botPlayer: Player, legal: LegalActions, thinkMs: number): BotDecision {
  if (!botPlayer.holeCards) {
    return fallbackDecision(legal, thinkMs);
  }

  const difficulty = botPlayer.botDifficulty ?? 'BEGINNER';
  const pot = potSize(state);
  const profile = drawProfile(botPlayer.holeCards, state.communityCards);
  const equity = approximateEquity(botPlayer.holeCards, state.communityCards, activePlayers(state));
  const required = requiredEquity(state, legal);

  if (difficulty === 'BEGINNER') {
    if (profile.topPairTopKickerOrBetter) {
      return betOrRaise(Math.round(pot * 0.5), legal, thinkMs);
    }

    if (profile.anyPair) {
      return callOrCheck(legal, thinkMs);
    }

    return required < 0.4 ? callOrCheck(legal, thinkMs) : foldOrCheck(legal, thinkMs);
  }

  if (difficulty === 'INTERMEDIATE') {
    if (equity > 0.7) {
      return betOrRaise(Math.round(pot * 0.75), legal, thinkMs);
    }

    if (equity >= 0.5) {
      return betOrRaise(Math.round(pot * 0.5), legal, thinkMs);
    }

    if (equity >= 0.3) {
      return required < equity ? callOrCheck(legal, thinkMs) : foldOrCheck(legal, thinkMs);
    }

    if (inPosition(state, botPlayer) && Math.random() < 0.2) {
      return betOrRaise(Math.round(pot * 0.5), legal, thinkMs);
    }

    return foldOrCheck(legal, thinkMs);
  }

  const betFractions = [0.33, 0.5, 0.75, 1];
  const selectedFraction = betFractions[Math.floor(Math.random() * betFractions.length)] ?? 0.5;
  const hasBluffCombo = profile.openEndedStraightDraw || profile.gutshotStraightDraw || (profile.flushDraw && botPlayer.holeCards.some((card) => card.rank === 'A'));

  if (equity > 0.55) {
    return betOrRaise(Math.round(pot * selectedFraction), legal, thinkMs);
  }

  if (legal.canCall && equity > required) {
    return callOrCheck(legal, thinkMs);
  }

  if (hasBluffCombo && inPosition(state, botPlayer) && Math.random() < 0.3) {
    return betOrRaise(Math.round(pot * selectedFraction), legal, thinkMs);
  }

  return foldOrCheck(legal, thinkMs);
}

export function getBotDecision(
  state: GameState,
  botPlayer: Player,
  legal: LegalActions,
): BotDecision {
  const difficulty = botPlayer.botDifficulty ?? 'BEGINNER';
  const thinkMs = difficulty === 'BEGINNER'
    ? randomBetween(300, 800)
    : difficulty === 'INTERMEDIATE'
      ? randomBetween(600, 1400)
      : randomBetween(800, 2000);

  if (botPlayer.stack === 0 || botPlayer.isAllIn) {
    return allInOrFallback(legal, thinkMs);
  }

  if (state.street === 'PREFLOP') {
    return preflopDecision(state, botPlayer, legal, thinkMs);
  }

  return postflopDecision(state, botPlayer, legal, thinkMs);
}
