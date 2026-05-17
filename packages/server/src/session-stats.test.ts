import { describe, expect, it } from 'vitest';
import type { HandHistoryRecord } from '@river/shared';
import { playerHandStatsDelta } from './session-stats';

describe('playerHandStatsDelta', () => {
  it('calculates persisted poker stats from a completed hand', () => {
    const hand: HandHistoryRecord = {
      id: 'hand-1',
      tableId: 'table-1',
      handNumber: 1,
      players: [
        { id: 'alice', name: 'Alice', position: 'BTN', stackBefore: 1000, stackAfter: 1120 },
        { id: 'bob', name: 'Bob', position: 'BB', stackBefore: 1000, stackAfter: 880 },
      ],
      holeCards: {
        alice: [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'spades' }],
        bob: [{ rank: 'Q', suit: 'hearts' }, { rank: 'Q', suit: 'clubs' }],
      },
      streets: [{
        street: 'PREFLOP',
        communityCards: [],
        potAfter: 240,
        actions: [
          { playerId: 'alice', street: 'PREFLOP', type: 'RAISE', amount: 120, timestamp: 1 },
          { playerId: 'bob', street: 'PREFLOP', type: 'CALL', amount: 120, timestamp: 2 },
        ],
      }],
      pots: [{ amount: 240, eligiblePlayerIds: ['alice', 'bob'] }],
      winners: [{ playerId: 'alice', amount: 240, potIndex: 0, handResult: null, showCards: false }],
      createdAt: 3,
    };

    expect(playerHandStatsDelta(hand, 'alice')).toEqual({
      won: true,
      profit: 120,
      vpip: true,
      pfr: true,
      biggestPotWon: 240,
    });
    expect(playerHandStatsDelta(hand, 'bob')).toEqual({
      won: false,
      profit: -120,
      vpip: true,
      pfr: false,
      biggestPotWon: 0,
    });
  });
});
