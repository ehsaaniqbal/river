import { describe, expect, it } from 'vitest';
import type { Card, GameState, Player } from './types';
import { applyAction, getLegalActions, initHand, runShowdown } from './game-engine';
import { makeCard } from './hand-evaluator';

const c = makeCard;

function player(id: string, stack = 100): Player {
  return {
    id,
    name: id,
    stack,
    holeCards: null,
    position: 'BTN',
    seatIndex: 0,
    isHuman: id === 'p1',
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalInvested: 0,
    isBot: id !== 'p1',
  };
}

function action(playerId: string, type: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN', amount: number, street = 'PREFLOP' as const) {
  return {
    playerId,
    type,
    amount,
    street,
    timestamp: 1,
  };
}

function state(overrides: Partial<GameState>): GameState {
  return {
    phase: 'PREFLOP',
    players: [],
    deck: [],
    communityCards: [],
    pots: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlind: 5,
    bigBlind: 10,
    minRaise: 10,
    lastAggressorIndex: -1,
    street: 'PREFLOP',
    actionHistory: [],
    handNumber: 1,
    winners: [],
    ...overrides,
  };
}

function deckForRunout(): Card[] {
  return [
    c('A', 'hearts'),
    c('K', 'hearts'),
    c('Q', 'clubs'),
    c('J', 'diamonds'),
    c('T', 'spades'),
  ];
}

describe('game engine', () => {
  it('preserves the big blind option when everyone calls preflop', () => {
    let game = initHand([player('btn'), player('sb'), player('bb')], 2, { small: 5, big: 10 });
    const btn = game.players[game.currentPlayerIndex];

    if (!btn) {
      throw new Error('Missing button');
    }

    game = applyAction(game, action(btn.id, 'CALL', 10));
    const sb = game.players[game.currentPlayerIndex];

    if (!sb) {
      throw new Error('Missing small blind');
    }

    game = applyAction(game, action(sb.id, 'CALL', 10));
    const bb = game.players[game.currentPlayerIndex];

    if (!bb) {
      throw new Error('Missing big blind');
    }

    const legal = getLegalActions(game);

    expect(bb.position).toBe('BB');
    expect(legal.canCheck).toBe(true);
    expect(legal.canRaise).toBe(true);
  });

  it('assigns heads-up blinds with the button acting first preflop', () => {
    const game = initHand([player('button'), player('big-blind')], -1, { small: 5, big: 10 });

    expect(game.players.map((seat) => [seat.id, seat.position, seat.currentBet])).toEqual([
      ['button', 'SB', 5],
      ['big-blind', 'BB', 10],
    ]);
    expect(game.players[game.currentPlayerIndex]?.id).toBe('button');
  });

  it('assigns distinct positions at a full nine-handed table', () => {
    const game = initHand(Array.from({ length: 9 }, (_, index) => player(`p${index}`)), -1, { small: 5, big: 10 });

    expect(game.players.map((seat) => seat.position)).toEqual([
      'BTN',
      'SB',
      'BB',
      'UTG',
      'UTG+1',
      'MP',
      'LJ',
      'HJ',
      'CO',
    ]);
  });

  it('runs out remaining streets when all remaining players are all-in', () => {
    const allInState = state({
      players: [
        {
          ...player('p1', 10),
          holeCards: [c('A', 'clubs'), c('K', 'diamonds')],
          currentBet: 10,
          totalInvested: 10,
        },
        {
          ...player('p2', 0),
          holeCards: [c('Q', 'clubs'), c('Q', 'diamonds')],
          currentBet: 20,
          totalInvested: 20,
          isAllIn: true,
        },
      ],
      deck: deckForRunout(),
      currentPlayerIndex: 0,
    });

    const result = applyAction(allInState, action('p1', 'ALL_IN', 10));

    expect(result.phase).toBe('HAND_COMPLETE');
    expect(result.communityCards).toHaveLength(5);
    expect(result.winners.length).toBeGreaterThan(0);
  });

  it('throws on illegal actions', () => {
    const checkFacingBet = state({
      players: [
        { ...player('p1'), currentBet: 0 },
        { ...player('p2'), currentBet: 10 },
      ],
      currentPlayerIndex: 0,
    });

    expect(() => applyAction(checkFacingBet, action('p1', 'CHECK', 0))).toThrow('Check is illegal');

    const raiseTooSmall = state({
      players: [
        { ...player('p1'), currentBet: 0, stack: 100 },
        { ...player('p2'), currentBet: 10, stack: 90 },
      ],
      currentPlayerIndex: 0,
      minRaise: 10,
    });

    expect(() => applyAction(raiseTooSmall, action('p1', 'RAISE', 15))).toThrow('Raise is illegal');
  });

  it('does not reopen raises to a player who already acted when facing a short all-in', () => {
    const shortAllInState = state({
      players: [
        { ...player('opener', 900), currentBet: 100, totalInvested: 100 },
        { ...player('short', 0), currentBet: 120, totalInvested: 120, isAllIn: true },
        { ...player('caller', 1000), currentBet: 0, totalInvested: 0 },
      ],
      currentPlayerIndex: 0,
      minRaise: 100,
      lastAggressorIndex: 0,
      actionHistory: [
        action('opener', 'BET', 100),
        action('short', 'ALL_IN', 120),
      ],
    });

    const legal = getLegalActions(shortAllInState);

    expect(legal.canCall).toBe(true);
    expect(legal.callAmount).toBe(20);
    expect(legal.canRaise).toBe(false);
  });

  it('ends the hand immediately when all but one player fold', () => {
    const foldState = state({
      players: [
        { ...player('p1'), currentBet: 10, totalInvested: 10 },
        { ...player('p2'), currentBet: 10, totalInvested: 10, isFolded: true },
        { ...player('p3'), currentBet: 10, totalInvested: 10 },
      ],
      currentPlayerIndex: 0,
    });

    const result = applyAction(foldState, action('p1', 'FOLD', 0));

    expect(result.phase).toBe('HAND_COMPLETE');
    expect(result.winners).toHaveLength(1);
    expect(result.winners[0]?.handResult).toBeNull();
  });

  it('awards an odd split-pot chip to the first winner left of the dealer', () => {
    const showdownState = state({
      phase: 'SHOWDOWN',
      street: 'SHOWDOWN',
      players: [
        {
          ...player('dealer', 0),
          holeCards: [c('2', 'clubs'), c('3', 'diamonds')],
          currentBet: 51,
          totalInvested: 51,
        },
        {
          ...player('left-of-dealer', 0),
          holeCards: [c('4', 'clubs'), c('5', 'diamonds')],
          currentBet: 50,
          totalInvested: 50,
        },
      ],
      dealerIndex: 0,
      communityCards: [
        c('A', 'hearts'),
        c('K', 'hearts'),
        c('Q', 'hearts'),
        c('J', 'hearts'),
        c('T', 'hearts'),
      ],
    });

    const result = runShowdown(showdownState);

    expect(result.winners.map((winner) => [winner.playerId, winner.amount])).toEqual([
      ['dealer', 50],
      ['left-of-dealer', 51],
    ]);
    expect(result.players.map((seat) => [seat.id, seat.stack])).toEqual([
      ['dealer', 50],
      ['left-of-dealer', 51],
    ]);
  });
});
