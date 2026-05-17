import { describe, expect, it } from 'vitest';
import { calculatePots } from './pot-calculator';
import type { Player } from './types';

function player(id: string, totalInvested: number, isAllIn: boolean, isFolded = false): Player {
  return {
    id,
    name: id,
    stack: 0,
    holeCards: null,
    position: 'BTN',
    seatIndex: 0,
    isHuman: false,
    isFolded,
    isAllIn,
    currentBet: totalInvested,
    totalInvested,
    isBot: true,
  };
}

describe('calculatePots', () => {
  it('creates side pots for a 3-way all-in at different stack depths', () => {
    const pots = calculatePots([
      player('short', 50, true),
      player('middle', 100, true),
      player('deep', 200, true),
    ]);

    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['short', 'middle', 'deep'] },
      { amount: 100, eligiblePlayerIds: ['middle', 'deep'] },
    ]);
  });

  it('keeps folded contributions in pots but excludes folded players from eligibility', () => {
    const pots = calculatePots([
      player('folded', 100, false, true),
      player('short', 50, true),
      player('deep', 100, false),
    ]);

    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['short', 'deep'] },
      { amount: 100, eligiblePlayerIds: ['deep'] },
    ]);
  });

  it('creates a main pot and side pot for a single all-in', () => {
    const pots = calculatePots([
      player('short', 40, true),
      player('caller', 100, false),
      player('raiser', 100, false),
    ]);

    expect(pots).toEqual([
      { amount: 120, eligiblePlayerIds: ['short', 'caller', 'raiser'] },
      { amount: 120, eligiblePlayerIds: ['caller', 'raiser'] },
    ]);
  });
});
