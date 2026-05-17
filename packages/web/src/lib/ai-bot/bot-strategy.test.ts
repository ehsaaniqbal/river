import { describe, expect, it } from 'vitest';
import { makeCard } from '@river/engine';
import { approximateEquity } from './bot-strategy';

const c = makeCard;

describe('bot strategy helpers', () => {
  it('uses top-pair top-kicker as a made-hand equity baseline', () => {
    const equity = approximateEquity(
      [c('A', 'clubs'), c('K', 'diamonds')],
      [c('K', 'hearts'), c('7', 'spades'), c('2', 'clubs')],
      2,
    );

    expect(equity).toBe(0.75);
  });

  it('applies rule of 2 and 4 draw approximation', () => {
    const flopFlushDraw = approximateEquity(
      [c('7', 'hearts'), c('6', 'hearts')],
      [c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs')],
      2,
    );
    const turnFlushDraw = approximateEquity(
      [c('7', 'hearts'), c('6', 'hearts')],
      [c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs'), c('3', 'spades')],
      2,
    );

    expect(flopFlushDraw).toBeGreaterThan(turnFlushDraw);
    expect(flopFlushDraw).toBeCloseTo(0.36);
    expect(turnFlushDraw).toBeCloseTo(0.18);
  });
});
