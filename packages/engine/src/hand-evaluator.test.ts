import { describe, expect, it } from 'vitest';
import { compareHands, evaluateBestHand, makeCard } from './hand-evaluator';
import type { Card } from './types';

const c = makeCard;

function hand(holeCards: [Card, Card], communityCards: [Card, Card, Card, Card, Card]) {
  return evaluateBestHand(holeCards, communityCards);
}

describe('hand evaluator', () => {
  it('royal flush beats straight flush', () => {
    const royal = hand(
      [c('A', 'hearts'), c('K', 'hearts')],
      [c('Q', 'hearts'), c('J', 'hearts'), c('T', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')],
    );
    const straightFlush = hand(
      [c('9', 'spades'), c('8', 'spades')],
      [c('7', 'spades'), c('6', 'spades'), c('5', 'spades'), c('A', 'clubs'), c('2', 'diamonds')],
    );

    expect(compareHands(royal, straightFlush)).toBe(1);
  });

  it('straight flush beats four of a kind', () => {
    const straightFlush = hand(
      [c('9', 'clubs'), c('8', 'clubs')],
      [c('7', 'clubs'), c('6', 'clubs'), c('5', 'clubs'), c('A', 'diamonds'), c('2', 'hearts')],
    );
    const quads = hand(
      [c('A', 'clubs'), c('A', 'diamonds')],
      [c('A', 'hearts'), c('A', 'spades'), c('K', 'clubs'), c('2', 'clubs'), c('3', 'diamonds')],
    );

    expect(compareHands(straightFlush, quads)).toBe(1);
  });

  it('full house beats flush', () => {
    const fullHouse = hand(
      [c('K', 'clubs'), c('K', 'diamonds')],
      [c('K', 'hearts'), c('9', 'spades'), c('9', 'clubs'), c('2', 'clubs'), c('3', 'diamonds')],
    );
    const flush = hand(
      [c('A', 'hearts'), c('J', 'hearts')],
      [c('8', 'hearts'), c('6', 'hearts'), c('3', 'hearts'), c('2', 'clubs'), c('K', 'diamonds')],
    );

    expect(compareHands(fullHouse, flush)).toBe(1);
  });

  it('resolves one-pair kickers correctly', () => {
    const betterKicker = hand(
      [c('A', 'clubs'), c('K', 'diamonds')],
      [c('A', 'hearts'), c('Q', 'spades'), c('J', 'clubs'), c('7', 'diamonds'), c('2', 'hearts')],
    );
    const worseKicker = hand(
      [c('A', 'diamonds'), c('K', 'clubs')],
      [c('A', 'spades'), c('Q', 'hearts'), c('T', 'clubs'), c('7', 'diamonds'), c('2', 'hearts')],
    );

    expect(compareHands(betterKicker, worseKicker)).toBe(1);
  });

  it('scores wheel straight below six-high straight', () => {
    const wheel = hand(
      [c('A', 'clubs'), c('2', 'diamonds')],
      [c('3', 'hearts'), c('4', 'spades'), c('5', 'clubs'), c('K', 'diamonds'), c('9', 'hearts')],
    );
    const sixHigh = hand(
      [c('2', 'clubs'), c('3', 'diamonds')],
      [c('4', 'hearts'), c('5', 'spades'), c('6', 'clubs'), c('K', 'diamonds'), c('9', 'hearts')],
    );

    expect(compareHands(wheel, sixHigh)).toBe(-1);
  });

  it('detects split pots with identical hand scores', () => {
    const first = hand(
      [c('A', 'clubs'), c('K', 'diamonds')],
      [c('Q', 'hearts'), c('J', 'spades'), c('T', 'clubs'), c('2', 'diamonds'), c('3', 'hearts')],
    );
    const second = hand(
      [c('A', 'diamonds'), c('K', 'clubs')],
      [c('Q', 'hearts'), c('J', 'spades'), c('T', 'clubs'), c('2', 'diamonds'), c('3', 'hearts')],
    );

    expect(compareHands(first, second)).toBe(0);
  });

  it('chooses flush over straight when cards allow both', () => {
    const result = hand(
      [c('A', 'hearts'), c('K', 'hearts')],
      [c('Q', 'hearts'), c('J', 'hearts'), c('9', 'hearts'), c('T', 'clubs'), c('8', 'diamonds')],
    );

    expect(result.rank).toBe('FLUSH');
  });
});
