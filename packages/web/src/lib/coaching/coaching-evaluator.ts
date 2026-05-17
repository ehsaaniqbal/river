import { RANK_VALUE, type ActionType, type CoachingAdvice, type GameState, type Player } from '@river/engine';
import { approximateEquity } from '@/lib/ai-bot/bot-strategy';
import { evaluateBestHand } from '@river/engine';
import type { LegalActions } from '@river/engine';

function potSize(state: GameState): number {
  return state.players.reduce((total, player) => total + player.totalInvested, 0);
}

function potOdds(state: GameState, legal: LegalActions): number {
  if (!legal.canCall || legal.callAmount <= 0) {
    return 0;
  }

  return (legal.callAmount / (potSize(state) + legal.callAmount)) * 100;
}

function activePlayers(state: GameState): number {
  return state.players.filter((player) => !player.isFolded).length;
}

function topPairOrBetter(player: Player, state: GameState): boolean {
  if (!player.holeCards || state.communityCards.length < 3) {
    return false;
  }

  const result = evaluateBestHand(player.holeCards, state.communityCards);

  if (result.rank !== 'HIGH_CARD' && result.rank !== 'ONE_PAIR') {
    return true;
  }

  if (result.rank !== 'ONE_PAIR') {
    return false;
  }

  const topBoardRank = Math.max(...state.communityCards.map((card) => RANK_VALUE[card.rank]));
  const pairRank = result.tiebreakers[0] ?? 0;

  return pairRank === topBoardRank;
}

function checkedToPlayer(state: GameState, humanPlayer: Player): boolean {
  const humanIndex = state.players.findIndex((player) => player.id === humanPlayer.id);
  const activeIndexes = state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isFolded);
  const lastActiveIndex = activeIndexes.at(-1)?.index;
  const noBetMade = state.players.every((player) => player.currentBet === 0);

  return noBetMade && humanIndex === lastActiveIndex;
}

function inPosition(state: GameState, humanPlayer: Player): boolean {
  const activePlayersInOrder = state.players.filter((player) => !player.isFolded);
  const index = activePlayersInOrder.findIndex((player) => player.id === humanPlayer.id);

  return index === activePlayersInOrder.length - 1;
}

export function evaluateAction(
  state: GameState,
  action: ActionType,
  amount: number,
  humanPlayer: Player,
  legal: LegalActions,
): CoachingAdvice {
  const odds = Math.round(potOdds(state, legal));
  const equity = humanPlayer.holeCards
    ? Math.round(approximateEquity(humanPlayer.holeCards, state.communityCards, activePlayers(state)) * 100)
    : 0;
  const isCallOrRaise = action === 'CALL' || action === 'RAISE';
  const isBetOrRaise = action === 'BET' || action === 'RAISE';
  const noBetMade = state.players.every((player) => player.currentBet === 0);
  const hasTopPairOrBetter = topPairOrBetter(humanPlayer, state);

  if (odds > equity + 10 && isCallOrRaise) {
    return {
      quality: 'BAD',
      recommendedAction: 'FOLD',
      explanation: `Calling here costs you ${odds}% but you only have ~${equity}% equity. This is a losing call long-term.`,
      potOdds: odds,
      equity,
    };
  }

  if (odds + 15 < equity && action === 'FOLD') {
    return {
      quality: 'BAD',
      recommendedAction: 'CALL',
      explanation: `You're folding with ~${equity}% equity when the pot is offering you ${odds}%. This was a profitable call.`,
      potOdds: odds,
      equity,
    };
  }

  if (hasTopPairOrBetter && noBetMade && action === 'CHECK') {
    return {
      quality: 'NEUTRAL',
      recommendedAction: 'BET',
      explanation: 'With a strong hand you can bet for value - around 50-75% of the pot is standard here.',
      potOdds: odds,
      equity,
    };
  }

  if (activePlayers(state) >= 3 && isBetOrRaise && !hasTopPairOrBetter) {
    return {
      quality: 'BAD',
      recommendedAction: legal.canCheck ? 'CHECK' : 'FOLD',
      explanation: 'Bluffing into multiple opponents rarely works - someone usually has something.',
      potOdds: odds,
      equity,
    };
  }

  if (inPosition(state, humanPlayer) && checkedToPlayer(state, humanPlayer) && action === 'CHECK') {
    return {
      quality: 'NEUTRAL',
      recommendedAction: 'BET',
      explanation: 'You could take a stab at this pot in position. A bet of 1/3 pot applies pressure.',
      potOdds: odds,
      equity,
    };
  }

  if (inPosition(state, humanPlayer) && isBetOrRaise && hasTopPairOrBetter && amount > 0) {
    return {
      quality: 'GOOD',
      recommendedAction: action,
      explanation: 'Nice value bet. Extracting chips when ahead is the foundation of winning poker.',
      potOdds: odds,
      equity,
    };
  }

  if (equity < odds && action === 'FOLD') {
    return {
      quality: 'GOOD',
      recommendedAction: 'FOLD',
      explanation: `Good laydown. You were getting ${odds}% from the pot but only had ~${equity}% equity.`,
      potOdds: odds,
      equity,
    };
  }

  if (action === 'CALL' && equity >= odds && odds > 0) {
    return {
      quality: 'GOOD',
      recommendedAction: 'CALL',
      explanation: `Good call. Your draw has ~${equity}% equity and the pot is offering ${odds}% - this is profitable.`,
      potOdds: odds,
      equity,
    };
  }

  return {
    quality: 'NEUTRAL',
    recommendedAction: action,
    explanation: 'Reasonable play. Keep paying attention to pot odds and position.',
    potOdds: odds,
    equity,
  };
}
