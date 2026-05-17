import {
  type Card,
  type GameState,
  type Player,
  type PlayerAction,
  type Position,
  type Pot,
  type Street,
  type WinnerResult,
} from './types';
import { createDeck, dealCards, shuffleDeck } from './deck';
import { calculatePots } from './pot-calculator';
import { compareHands, evaluateBestHand } from './hand-evaluator';

export type LegalActions = {
  canCheck: boolean;
  canCall: boolean; callAmount: number;
  canBet: boolean; minBet: number; maxBet: number;
  canRaise: boolean; minRaise: number; maxRaise: number;
  canFold: boolean;
  isAllIn: boolean; allInAmount: number;
};

const positionOrder: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'];

function nextIndex(players: Player[], fromIndex: number): number {
  if (players.length === 0) {
    throw new Error('Cannot find next index without players');
  }

  return (fromIndex + 1) % players.length;
}

function nextEligibleIndex(players: Player[], fromIndex: number): number {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (fromIndex + offset) % players.length;
    const player = players[index];

    if (player && !player.isFolded && !player.isAllIn && player.stack > 0) {
      return index;
    }
  }

  return fromIndex;
}

function highestCurrentBet(players: Player[]): number {
  return players.reduce((highest, player) => Math.max(highest, player.currentBet), 0);
}

function potAmount(pots: Pot[]): number {
  return pots.reduce((sum, pot) => sum + pot.amount, 0);
}

function postBlind(player: Player, amount: number): Player {
  const posted = Math.min(player.stack, amount);

  return {
    ...player,
    stack: player.stack - posted,
    currentBet: posted,
    totalInvested: posted,
    isAllIn: player.stack - posted === 0,
  };
}

function assignPositions(players: Player[], dealerIndex: number): Player[] {
  return players.map((player, index) => {
    const distanceFromDealer = (index - dealerIndex + players.length) % players.length;
    const position = players.length === 2
      ? (distanceFromDealer === 0 ? 'SB' : 'BB')
      : positionOrder[distanceFromDealer] ?? 'CO';

    return {
      ...player,
      position,
      seatIndex: index,
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      totalInvested: 0,
      holeCards: null,
    };
  });
}

function dealHoleCards(players: Player[], deck: Card[]): { players: Player[]; deck: Card[] } {
  let remaining = deck;
  const dealtPlayers = players.map((player) => {
    const firstDeal = dealCards(remaining, 2);
    const first = firstDeal.dealt[0];
    const second = firstDeal.dealt[1];

    if (!first || !second) {
      throw new Error('Unable to deal hole cards');
    }

    remaining = firstDeal.remaining;

    return {
      ...player,
      holeCards: [first, second] as [Card, Card],
    };
  });

  return { players: dealtPlayers, deck: remaining };
}

function blindIndexes(players: Player[], dealerIndex: number): { smallBlindIndex: number; bigBlindIndex: number } {
  if (players.length === 2) {
    return {
      smallBlindIndex: dealerIndex,
      bigBlindIndex: nextIndex(players, dealerIndex),
    };
  }

  const smallBlindIndex = nextIndex(players, dealerIndex);

  return {
    smallBlindIndex,
    bigBlindIndex: nextIndex(players, smallBlindIndex),
  };
}

function firstPreflopIndex(players: Player[], dealerIndex: number, bigBlindIndex: number): number {
  if (players.length === 2) {
    return dealerIndex;
  }

  return nextEligibleIndex(players, bigBlindIndex);
}

function firstPostflopIndex(players: Player[], dealerIndex: number): number {
  return nextEligibleIndex(players, dealerIndex);
}

function playersWithResetBets(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    currentBet: 0,
  }));
}

function streetActionPlayerIds(state: GameState): Set<string> {
  return new Set(
    state.actionHistory
      .filter((action) => action.street === state.street)
      .map((action) => action.playerId),
  );
}

function hasActedSinceLastFullAggression(state: GameState, playerId: string): boolean {
  if (state.lastAggressorIndex === -1) {
    return false;
  }

  const aggressor = state.players[state.lastAggressorIndex];

  if (!aggressor) {
    return false;
  }

  const streetActions = state.actionHistory.filter((action) => action.street === state.street);
  const lastFullAggressionIndex = streetActions.findLastIndex((action) => {
    return action.playerId === aggressor.id && (action.type === 'BET' || action.type === 'RAISE' || action.type === 'ALL_IN');
  });
  const relevantActions = lastFullAggressionIndex === -1
    ? streetActions
    : streetActions.slice(lastFullAggressionIndex);

  return relevantActions.some((action) => action.playerId === playerId);
}

function isFacingIncompleteRaise(state: GameState, player: Player): boolean {
  if (state.lastAggressorIndex === -1) {
    return false;
  }

  const fullAggressor = state.players[state.lastAggressorIndex];

  if (!fullAggressor) {
    return false;
  }

  const highest = highestCurrentBet(state.players);

  return highest > fullAggressor.currentBet && hasActedSinceLastFullAggression(state, player.id);
}

function isBigBlindOption(state: GameState, player: Player): boolean {
  if (state.street !== 'PREFLOP') {
    return false;
  }

  const highest = highestCurrentBet(state.players);
  const hasActed = streetActionPlayerIds(state).has(player.id);

  return player.position === 'BB' && player.currentBet === highest && highest === state.bigBlind && !hasActed;
}

function isStreetComplete(state: GameState): boolean {
  const activePlayers = state.players.filter((player) => !player.isFolded && !player.isAllIn);

  if (activePlayers.length <= 1) {
    return true;
  }

  const highest = highestCurrentBet(state.players);
  const acted = streetActionPlayerIds(state);
  const betsEqual = activePlayers.every((player) => player.currentBet === highest);

  if (!betsEqual) {
    return false;
  }

  return activePlayers.every((player) => acted.has(player.id));
}

function nextStreet(street: Street): Street {
  switch (street) {
    case 'PREFLOP':
      return 'FLOP';
    case 'FLOP':
      return 'TURN';
    case 'TURN':
      return 'RIVER';
    case 'RIVER':
    case 'SHOWDOWN':
      return 'SHOWDOWN';
  }
}

function dealCommunityCardsForStreet(state: GameState, street: Street): { communityCards: Card[]; deck: Card[] } {
  const count = street === 'FLOP' ? 3 : 1;
  const dealt = dealCards(state.deck, count);

  return {
    communityCards: [...state.communityCards, ...dealt.dealt],
    deck: dealt.remaining,
  };
}

function runOutBoard(state: GameState): GameState {
  let nextState = state;

  while (nextState.communityCards.length < 5) {
    const targetStreet = nextState.communityCards.length === 0
      ? 'FLOP'
      : nextState.communityCards.length === 3
        ? 'TURN'
        : 'RIVER';
    nextState = dealStreet({
      ...nextState,
      street: targetStreet === 'FLOP' ? 'PREFLOP' : targetStreet === 'TURN' ? 'FLOP' : 'TURN',
    });
  }

  return runShowdown(nextState);
}

function awardUncontestedPot(state: GameState): GameState {
  const winner = state.players.find((player) => !player.isFolded);

  if (!winner) {
    throw new Error('Cannot award pot without a winner');
  }

  const totalPot = potAmount(calculatePots(state.players));
  const players = state.players.map((player) => player.id === winner.id ? { ...player, stack: player.stack + totalPot } : player);

  return {
    ...state,
    phase: 'HAND_COMPLETE',
    players,
    pots: calculatePots(state.players),
    winners: [{
      playerId: winner.id,
      potIndex: 0,
      amount: totalPot,
      handResult: null,
      showCards: false,
    }],
  };
}

export function initHand(players: Player[], dealerIndex: number, blinds: { small: number; big: number }): GameState {
  if (players.length < 2) {
    throw new Error('At least two players are required');
  }

  const newDealerIndex = nextIndex(players, dealerIndex);
  const positionedPlayers = assignPositions(players, newDealerIndex);
  const dealt = dealHoleCards(positionedPlayers, shuffleDeck(createDeck()));
  const indexes = blindIndexes(dealt.players, newDealerIndex);
  const playersWithBlinds = dealt.players.map((player, index) => {
    if (index === indexes.smallBlindIndex) {
      return postBlind(player, blinds.small);
    }

    if (index === indexes.bigBlindIndex) {
      return postBlind(player, blinds.big);
    }

    return player;
  });

  return {
    phase: 'PREFLOP',
    players: playersWithBlinds,
    deck: dealt.deck,
    communityCards: [],
    pots: calculatePots(playersWithBlinds),
    currentPlayerIndex: firstPreflopIndex(playersWithBlinds, newDealerIndex, indexes.bigBlindIndex),
    dealerIndex: newDealerIndex,
    smallBlind: blinds.small,
    bigBlind: blinds.big,
    minRaise: blinds.big,
    lastAggressorIndex: indexes.bigBlindIndex,
    street: 'PREFLOP',
    actionHistory: [],
    handNumber: 1,
    winners: [],
  };
}

export function getLegalActions(state: GameState): LegalActions {
  const player = state.players[state.currentPlayerIndex];

  if (!player || player.isFolded || player.isAllIn || state.phase === 'HAND_COMPLETE') {
    return {
      canCheck: false,
      canCall: false,
      callAmount: 0,
      canBet: false,
      minBet: 0,
      maxBet: 0,
      canRaise: false,
      minRaise: 0,
      maxRaise: 0,
      canFold: false,
      isAllIn: false,
      allInAmount: 0,
    };
  }

  const highest = highestCurrentBet(state.players);
  const toCall = Math.max(highest - player.currentBet, 0);
  const callAmount = Math.min(toCall, player.stack);
  const maxRaise = player.currentBet + player.stack;
  const minRaise = highest + state.minRaise;
  const bigBlindOption = isBigBlindOption(state, player);
  const canReopenRaise = !isFacingIncompleteRaise(state, player);

  return {
    canCheck: toCall === 0,
    canCall: toCall > 0 && player.stack > 0,
    callAmount,
    canBet: toCall === 0 && !bigBlindOption && player.stack >= state.bigBlind,
    minBet: toCall === 0 ? Math.min(state.bigBlind, player.stack) : 0,
    maxBet: toCall === 0 ? player.stack : 0,
    canRaise: canReopenRaise && (toCall > 0 || bigBlindOption) && maxRaise >= minRaise,
    minRaise,
    maxRaise,
    canFold: true,
    isAllIn: player.stack > 0,
    allInAmount: player.stack,
  };
}

export function isHandOver(state: GameState): boolean {
  return state.players.filter((player) => !player.isFolded).length <= 1 || state.phase === 'HAND_COMPLETE';
}

function applyPlayerUpdate(state: GameState, action: PlayerAction): GameState {
  const player = state.players[state.currentPlayerIndex];

  if (!player) {
    throw new Error('No current player');
  }

  if (player.id !== action.playerId) {
    throw new Error('Action player is not current player');
  }

  const legal = getLegalActions(state);
  const highest = highestCurrentBet(state.players);

  const updatedPlayers = state.players.map((existingPlayer, index) => {
    if (index !== state.currentPlayerIndex) {
      return existingPlayer;
    }

    switch (action.type) {
      case 'FOLD':
        if (!legal.canFold) {
          throw new Error('Fold is illegal');
        }

        return { ...existingPlayer, isFolded: true };
      case 'CHECK':
        if (!legal.canCheck) {
          throw new Error('Check is illegal');
        }

        return existingPlayer;
      case 'CALL': {
        if (!legal.canCall) {
          throw new Error('Call is illegal');
        }

        const contribution = legal.callAmount;

        return {
          ...existingPlayer,
          stack: existingPlayer.stack - contribution,
          currentBet: existingPlayer.currentBet + contribution,
          totalInvested: existingPlayer.totalInvested + contribution,
          isAllIn: existingPlayer.stack - contribution === 0,
        };
      }
      case 'BET': {
        if (!legal.canBet || action.amount < legal.minBet || action.amount > legal.maxBet) {
          throw new Error('Bet is illegal');
        }

        return {
          ...existingPlayer,
          stack: existingPlayer.stack - action.amount,
          currentBet: action.amount,
          totalInvested: existingPlayer.totalInvested + action.amount,
          isAllIn: existingPlayer.stack - action.amount === 0,
        };
      }
      case 'RAISE': {
        if (!legal.canRaise || action.amount < legal.minRaise || action.amount > legal.maxRaise) {
          throw new Error('Raise is illegal');
        }

        const contribution = action.amount - existingPlayer.currentBet;

        return {
          ...existingPlayer,
          stack: existingPlayer.stack - contribution,
          currentBet: action.amount,
          totalInvested: existingPlayer.totalInvested + contribution,
          isAllIn: existingPlayer.stack - contribution === 0,
        };
      }
      case 'ALL_IN': {
        if (!legal.isAllIn) {
          throw new Error('All-in is illegal');
        }

        const contribution = existingPlayer.stack;

        return {
          ...existingPlayer,
          stack: 0,
          currentBet: existingPlayer.currentBet + contribution,
          totalInvested: existingPlayer.totalInvested + contribution,
          isAllIn: true,
        };
      }
    }
  });

  const updatedPlayer = updatedPlayers[state.currentPlayerIndex];

  if (!updatedPlayer) {
    throw new Error('No updated current player');
  }

  const newHighest = highestCurrentBet(updatedPlayers);
  const aggressive = action.type === 'BET' || action.type === 'RAISE' || (action.type === 'ALL_IN' && newHighest > highest);
  const raiseSize = aggressive ? newHighest - highest : state.minRaise;

  return {
    ...state,
    players: updatedPlayers,
    pots: calculatePots(updatedPlayers),
    actionHistory: [...state.actionHistory, action],
    minRaise: aggressive && raiseSize >= state.minRaise ? raiseSize : state.minRaise,
    lastAggressorIndex: aggressive ? state.currentPlayerIndex : state.lastAggressorIndex,
  };
}

export function applyAction(state: GameState, action: PlayerAction): GameState {
  const afterAction = applyPlayerUpdate(state, action);
  const nonFolded = afterAction.players.filter((player) => !player.isFolded);
  const activeNonAllIn = nonFolded.filter((player) => !player.isAllIn);

  if (nonFolded.length === 1) {
    return awardUncontestedPot(afterAction);
  }

  if (activeNonAllIn.length <= 1) {
    return runOutBoard(afterAction);
  }

  if (isStreetComplete(afterAction)) {
    if (afterAction.street === 'RIVER') {
      return runShowdown(afterAction);
    }

    return dealStreet(afterAction);
  }

  return {
    ...afterAction,
    currentPlayerIndex: nextEligibleIndex(afterAction.players, afterAction.currentPlayerIndex),
  };
}

export function dealStreet(state: GameState): GameState {
  const targetStreet = nextStreet(state.street);

  if (targetStreet === 'SHOWDOWN') {
    return runShowdown(state);
  }

  const dealt = dealCommunityCardsForStreet(state, targetStreet);
  const resetPlayers = playersWithResetBets(state.players);

  return {
    ...state,
    phase: targetStreet,
    street: targetStreet,
    deck: dealt.deck,
    communityCards: dealt.communityCards,
    players: resetPlayers,
    currentPlayerIndex: firstPostflopIndex(resetPlayers, state.dealerIndex),
    minRaise: state.bigBlind,
    lastAggressorIndex: -1,
  };
}

function splitAmount(amount: number, winnerCount: number): { base: number; odd: number } {
  return {
    base: Math.floor(amount / winnerCount),
    odd: amount % winnerCount,
  };
}

function orderedFromDealer(players: Player[], dealerIndex: number): Player[] {
  return players
    .map((player, index) => {
      const distance = (index - dealerIndex + players.length) % players.length;
      return { player, distance: distance === 0 ? players.length : distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ player }) => player);
}

export function runShowdown(state: GameState): GameState {
  const pots = calculatePots(state.players);
  const nonFolded = state.players.filter((player) => !player.isFolded);

  if (nonFolded.length === 1) {
    return awardUncontestedPot({ ...state, pots });
  }

  if (state.communityCards.length !== 5) {
    throw new Error('Showdown requires five community cards');
  }

  const results = new Map<string, ReturnType<typeof evaluateBestHand>>();

  for (const player of nonFolded) {
    if (!player.holeCards) {
      throw new Error('Showdown player is missing hole cards');
    }

    results.set(player.id, evaluateBestHand(player.holeCards, state.communityCards));
  }

  const nextPlayers = state.players.map((player) => ({ ...player }));
  const winners: WinnerResult[] = [];
  const dealerOrderedPlayers = orderedFromDealer(state.players, state.dealerIndex);

  pots.forEach((pot, potIndex) => {
    const eligibleResults = pot.eligiblePlayerIds
      .map((playerId) => {
        const result = results.get(playerId);
        return result ? { playerId, result } : null;
      })
      .filter((entry): entry is { playerId: string; result: ReturnType<typeof evaluateBestHand> } => entry !== null);

    const bestEntries = eligibleResults.reduce<{ playerId: string; result: ReturnType<typeof evaluateBestHand> }[]>((best, entry) => {
      const comparison = best[0] ? compareHands(entry.result, best[0].result) : 1;

      if (comparison > 0) {
        return [entry];
      }

      if (comparison === 0) {
        return [...best, entry];
      }

      return best;
    }, []);

    if (bestEntries.length === 0) {
      return;
    }

    const split = splitAmount(pot.amount, bestEntries.length);
    const bestIds = new Set(bestEntries.map((entry) => entry.playerId));
    const oddChipWinner = dealerOrderedPlayers.find((player) => bestIds.has(player.id));

    for (const entry of bestEntries) {
      const oddChip = oddChipWinner?.id === entry.playerId ? split.odd : 0;
      const amount = split.base + oddChip;
      const playerIndex = nextPlayers.findIndex((player) => player.id === entry.playerId);
      const winnerPlayer = nextPlayers[playerIndex];

      if (!winnerPlayer) {
        throw new Error('Winner not found');
      }

      nextPlayers[playerIndex] = {
        ...winnerPlayer,
        stack: winnerPlayer.stack + amount,
      };
      winners.push({
        playerId: entry.playerId,
        potIndex,
        amount,
        handResult: entry.result,
        showCards: true,
      });
    }
  });

  return {
    ...state,
    phase: 'HAND_COMPLETE',
    street: 'SHOWDOWN',
    pots,
    players: nextPlayers,
    winners,
  };
}
