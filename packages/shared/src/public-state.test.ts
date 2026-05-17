import { describe, expect, it } from 'vitest';
import type { Card, GameState, Player } from '@river/engine';
import { makeCard } from '@river/engine';
import { createPublicGameState, sanitizeTableConfig } from './index';

const c = makeCard;

function player(id: string, cards: [Card, Card]): Player {
  return {
    id,
    name: id,
    stack: 1000,
    holeCards: cards,
    position: 'BTN',
    seatIndex: 0,
    isHuman: true,
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalInvested: 0,
    isBot: false,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'PREFLOP',
    players: [
      player('hero', [c('A', 'spades'), c('A', 'hearts')]),
      player('villain', [c('K', 'clubs'), c('K', 'diamonds')]),
    ],
    deck: [c('2', 'clubs')],
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

describe('createPublicGameState', () => {
  it('only exposes hole cards to the viewer before showdown', () => {
    const view = createPublicGameState({
      state: state(),
      viewerId: 'hero',
      players: [
        { playerId: 'hero', connected: true, disconnectDeadline: null, isHost: true },
        { playerId: 'villain', connected: true, disconnectDeadline: null, isHost: false },
      ],
    });

    expect(view.players[0]?.holeCards).toEqual([c('A', 'spades'), c('A', 'hearts')]);
    expect(view.players[1]?.holeCards).toBeNull();
    expect(view.deckCount).toBe(1);
  });

  it('reveals showdown cards only for winners marked as shown', () => {
    const view = createPublicGameState({
      state: state({
        phase: 'HAND_COMPLETE',
        street: 'SHOWDOWN',
        winners: [
          {
            playerId: 'villain',
            potIndex: 0,
            amount: 100,
            handResult: null,
            showCards: true,
          },
        ],
      }),
      viewerId: 'rail',
      players: [],
    });

    expect(view.players[0]?.holeCards).toBeNull();
    expect(view.players[1]?.holeCards).toEqual([c('K', 'clubs'), c('K', 'diamonds')]);
  });
});

describe('sanitizeTableConfig', () => {
  it('clamps public table configuration into supported bounds', () => {
    const config = sanitizeTableConfig({
      name: '  High   Noon  ',
      smallBlind: -20,
      bigBlind: 1,
      minBuyIn: 1,
      maxBuyIn: 2,
      maxPlayers: 20,
    });

    expect(config).toMatchObject({
      name: 'High Noon',
      smallBlind: 1,
      bigBlind: 2,
      minBuyIn: 40,
      maxBuyIn: 40,
      maxPlayers: 9,
    });
  });
});
