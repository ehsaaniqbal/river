import { describe, expect, it } from 'vitest';
import { makeCard } from '@river/engine';
import { RANGES, isInRange, toHandNotation } from './hand-ranges';

const c = makeCard;

describe('hand ranges', () => {
  it('returns canonical hand notation', () => {
    expect(toHandNotation([c('A', 'spades'), c('K', 'spades')])).toBe('AKs');
    expect(toHandNotation([c('K', 'spades'), c('A', 'hearts')])).toBe('AKo');
    expect(toHandNotation([c('Q', 'clubs'), c('Q', 'hearts')])).toBe('QQ');
  });

  it('checks position-aware intermediate ranges', () => {
    expect(isInRange([c('8', 'clubs'), c('8', 'hearts')], RANGES.INTERMEDIATE.UTG)).toBe(true);
    expect(isInRange([c('7', 'clubs'), c('7', 'hearts')], RANGES.INTERMEDIATE.UTG)).toBe(false);
    expect(isInRange([c('A', 'clubs'), c('4', 'clubs')], RANGES.INTERMEDIATE.BTN)).toBe(true);
    expect(isInRange([c('A', 'clubs'), c('4', 'hearts')], RANGES.INTERMEDIATE.BTN)).toBe(false);
  });
});
