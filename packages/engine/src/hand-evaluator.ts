import {
  HAND_RANK_VALUE,
  RANK_VALUE,
  type Card,
  type HandRank,
  type HandResult,
  type Rank,
} from './types';

type FiveCards = [Card, Card, Card, Card, Card];

type ScoredHand = HandResult & {
  score: number;
};

const evaluationCache = new Map<string, HandResult>();

const rankName: Record<number, string> = {
  14: 'Ace',
  13: 'King',
  12: 'Queen',
  11: 'Jack',
  10: 'Ten',
  9: 'Nine',
  8: 'Eight',
  7: 'Seven',
  6: 'Six',
  5: 'Five',
  4: 'Four',
  3: 'Three',
  2: 'Two',
};

const pluralRankName: Record<number, string> = {
  14: 'Aces',
  13: 'Kings',
  12: 'Queens',
  11: 'Jacks',
  10: 'Tens',
  9: 'Nines',
  8: 'Eights',
  7: 'Sevens',
  6: 'Sixes',
  5: 'Fives',
  4: 'Fours',
  3: 'Threes',
  2: 'Twos',
};

function cardKey(card: Card): string {
  const suitLetter = card.suit[0];

  if (suitLetter === undefined) {
    throw new Error('Invalid card suit');
  }

  return `${card.rank}${suitLetter}`;
}

function cacheKey(cards: Card[]): string {
  return cards
    .map(cardKey)
    .sort()
    .join('-');
}

function packRanks(ranks: number[]): number {
  return ranks.reduce((packed, rank) => (packed << 4) | rank, 0);
}

function encodedScore(rank: HandRank, packedTiebreaker: number): number {
  return (HAND_RANK_VALUE[rank] << 24) | packedTiebreaker;
}

function toFiveCards(cards: Card[]): FiveCards {
  const first = cards[0];
  const second = cards[1];
  const third = cards[2];
  const fourth = cards[3];
  const fifth = cards[4];

  if (!first || !second || !third || !fourth || !fifth || cards.length !== 5) {
    throw new Error('Expected exactly five cards');
  }

  return [first, second, third, fourth, fifth];
}

function rankValues(cards: Card[]): number[] {
  return cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
}

function rankGroups(cards: Card[]): Map<number, Card[]> {
  const groups = new Map<number, Card[]>();

  for (const card of cards) {
    const rank = RANK_VALUE[card.rank];
    const existing = groups.get(rank) ?? [];
    groups.set(rank, [...existing, card]);
  }

  return groups;
}

function uniqueRankValues(cards: Card[]): number[] {
  return [...new Set(rankValues(cards))].sort((a, b) => b - a);
}

function straightHigh(cards: Card[]): number | null {
  const values = uniqueRankValues(cards);
  const wheelValues = values.includes(14) ? [...values, 1] : values;

  for (let index = 0; index <= wheelValues.length - 5; index += 1) {
    const first = wheelValues[index];
    const second = wheelValues[index + 1];
    const third = wheelValues[index + 2];
    const fourth = wheelValues[index + 3];
    const fifth = wheelValues[index + 4];

    if (
      first !== undefined &&
      second !== undefined &&
      third !== undefined &&
      fourth !== undefined &&
      fifth !== undefined &&
      first - second === 1 &&
      second - third === 1 &&
      third - fourth === 1 &&
      fourth - fifth === 1
    ) {
      return first;
    }
  }

  return null;
}

function sortCardsForRanks(cards: Card[], ranks: number[]): FiveCards {
  const remaining = [...cards];
  const sorted: Card[] = [];

  for (const rank of ranks) {
    const index = remaining.findIndex((card) => RANK_VALUE[card.rank] === rank);

    if (index === -1) {
      throw new Error(`Missing card rank ${rank}`);
    }

    const card = remaining[index];

    if (!card) {
      throw new Error(`Missing card rank ${rank}`);
    }

    sorted.push(card);
    remaining.splice(index, 1);
  }

  return toFiveCards(sorted);
}

function sortGroupedCards(cards: Card[], orderedRanks: number[]): FiveCards {
  const groups = rankGroups(cards);
  const sorted: Card[] = [];

  for (const rank of orderedRanks) {
    const cardsForRank = groups.get(rank) ?? [];
    sorted.push(...cardsForRank);
  }

  return toFiveCards(sorted);
}

function analyze5(cards: FiveCards): ScoredHand {
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = straightHigh(cards);
  const groups = [...rankGroups(cards).entries()]
    .map(([rank, groupedCards]) => ({ rank, count: groupedCards.length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const sortedRanks = rankValues(cards);

  if (flush && straight === 14) {
    return {
      rank: 'ROYAL_FLUSH',
      bestFive: sortCardsForRanks(cards, [14, 13, 12, 11, 10]),
      tiebreakers: [],
      score: encodedScore('ROYAL_FLUSH', 0),
    };
  }

  if (flush && straight !== null) {
    const ranks = straight === 5 ? [5, 4, 3, 2, 14] : [straight, straight - 1, straight - 2, straight - 3, straight - 4];

    return {
      rank: 'STRAIGHT_FLUSH',
      bestFive: sortCardsForRanks(cards, ranks),
      tiebreakers: [straight],
      score: encodedScore('STRAIGHT_FLUSH', straight),
    };
  }

  const quad = groups.find((group) => group.count === 4);

  if (quad) {
    const kicker = groups.find((group) => group.count === 1);

    if (!kicker) {
      throw new Error('Four of a kind missing kicker');
    }

    return {
      rank: 'FOUR_OF_A_KIND',
      bestFive: sortGroupedCards(cards, [quad.rank, kicker.rank]),
      tiebreakers: [quad.rank, kicker.rank],
      score: encodedScore('FOUR_OF_A_KIND', (quad.rank << 5) | kicker.rank),
    };
  }

  const trip = groups.find((group) => group.count === 3);
  const pair = groups.find((group) => group.count === 2);

  if (trip && pair) {
    return {
      rank: 'FULL_HOUSE',
      bestFive: sortGroupedCards(cards, [trip.rank, pair.rank]),
      tiebreakers: [trip.rank, pair.rank],
      score: encodedScore('FULL_HOUSE', (trip.rank << 5) | pair.rank),
    };
  }

  if (flush) {
    return {
      rank: 'FLUSH',
      bestFive: sortCardsForRanks(cards, sortedRanks),
      tiebreakers: sortedRanks,
      score: encodedScore('FLUSH', packRanks(sortedRanks)),
    };
  }

  if (straight !== null) {
    const ranks = straight === 5 ? [5, 4, 3, 2, 14] : [straight, straight - 1, straight - 2, straight - 3, straight - 4];

    return {
      rank: 'STRAIGHT',
      bestFive: sortCardsForRanks(cards, ranks),
      tiebreakers: [straight],
      score: encodedScore('STRAIGHT', straight),
    };
  }

  if (trip) {
    const kickers = groups
      .filter((group) => group.count === 1)
      .map((group) => group.rank)
      .sort((a, b) => b - a);
    const firstKicker = kickers[0];
    const secondKicker = kickers[1];

    if (firstKicker === undefined || secondKicker === undefined) {
      throw new Error('Three of a kind missing kickers');
    }

    return {
      rank: 'THREE_OF_A_KIND',
      bestFive: sortGroupedCards(cards, [trip.rank, firstKicker, secondKicker]),
      tiebreakers: [trip.rank, firstKicker, secondKicker],
      score: encodedScore('THREE_OF_A_KIND', (trip.rank << 10) | (firstKicker << 5) | secondKicker),
    };
  }

  const pairs = groups
    .filter((group) => group.count === 2)
    .map((group) => group.rank)
    .sort((a, b) => b - a);

  if (pairs.length === 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kicker = groups.find((group) => group.count === 1);

    if (highPair === undefined || lowPair === undefined || !kicker) {
      throw new Error('Two pair missing rank data');
    }

    return {
      rank: 'TWO_PAIR',
      bestFive: sortGroupedCards(cards, [highPair, lowPair, kicker.rank]),
      tiebreakers: [highPair, lowPair, kicker.rank],
      score: encodedScore('TWO_PAIR', (highPair << 10) | (lowPair << 5) | kicker.rank),
    };
  }

  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const kickers = groups
      .filter((group) => group.count === 1)
      .map((group) => group.rank)
      .sort((a, b) => b - a);
    const firstKicker = kickers[0];
    const secondKicker = kickers[1];
    const thirdKicker = kickers[2];

    if (pairRank === undefined || firstKicker === undefined || secondKicker === undefined || thirdKicker === undefined) {
      throw new Error('One pair missing rank data');
    }

    return {
      rank: 'ONE_PAIR',
      bestFive: sortGroupedCards(cards, [pairRank, firstKicker, secondKicker, thirdKicker]),
      tiebreakers: [pairRank, firstKicker, secondKicker, thirdKicker],
      score: encodedScore('ONE_PAIR', (pairRank << 15) | (firstKicker << 10) | (secondKicker << 5) | thirdKicker),
    };
  }

  return {
    rank: 'HIGH_CARD',
    bestFive: sortCardsForRanks(cards, sortedRanks),
    tiebreakers: sortedRanks,
    score: encodedScore('HIGH_CARD', packRanks(sortedRanks)),
  };
}

export function score5(cards: FiveCards): number {
  return analyze5(cards).score;
}

function combinationsOfFive(cards: Card[]): FiveCards[] {
  const combinations: FiveCards[] = [];

  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const first = cards[a];
            const second = cards[b];
            const third = cards[c];
            const fourth = cards[d];
            const fifth = cards[e];

            if (!first || !second || !third || !fourth || !fifth) {
              throw new Error('Invalid card combination');
            }

            combinations.push([first, second, third, fourth, fifth]);
          }
        }
      }
    }
  }

  return combinations;
}

export function evaluateBestHand(holeCards: [Card, Card], communityCards: Card[]): HandResult {
  if (![3, 4, 5].includes(communityCards.length)) {
    throw new Error('communityCards.length must be 3, 4, or 5');
  }

  const cards = [...holeCards, ...communityCards];
  const key = cacheKey(cards);
  const cached = evaluationCache.get(key);

  if (cached) {
    return cached;
  }

  const scoredHands = combinationsOfFive(cards).map(analyze5);
  const best = scoredHands.reduce<ScoredHand | null>((currentBest, candidate) => {
    if (!currentBest || candidate.score > currentBest.score) {
      return candidate;
    }

    return currentBest;
  }, null);

  if (!best) {
    throw new Error('Unable to evaluate hand');
  }

  const result: HandResult = {
    rank: best.rank,
    bestFive: best.bestFive,
    tiebreakers: best.tiebreakers,
  };

  evaluationCache.set(key, result);

  return result;
}

export function compareHands(a: HandResult, b: HandResult): 1 | 0 | -1 {
  const rankDifference = HAND_RANK_VALUE[a.rank] - HAND_RANK_VALUE[b.rank];

  if (rankDifference > 0) {
    return 1;
  }

  if (rankDifference < 0) {
    return -1;
  }

  const length = Math.max(a.tiebreakers.length, b.tiebreakers.length);

  for (let index = 0; index < length; index += 1) {
    const left = a.tiebreakers[index] ?? 0;
    const right = b.tiebreakers[index] ?? 0;

    if (left > right) {
      return 1;
    }

    if (left < right) {
      return -1;
    }
  }

  return 0;
}

function cardRankDescription(rank: number): string {
  return rankName[rank] ?? String(rank);
}

function pluralDescription(rank: number): string {
  return pluralRankName[rank] ?? `${rank}s`;
}

export function getHandDescription(result: HandResult): string {
  const first = result.tiebreakers[0];
  const second = result.tiebreakers[1];

  switch (result.rank) {
    case 'ROYAL_FLUSH':
      return 'Royal Flush';
    case 'STRAIGHT_FLUSH':
      return `${cardRankDescription(first ?? 0)}-high Straight Flush`;
    case 'FOUR_OF_A_KIND':
      return `Four of a Kind, ${pluralDescription(first ?? 0)}`;
    case 'FULL_HOUSE':
      return `${pluralDescription(first ?? 0)} full of ${pluralDescription(second ?? 0)}`;
    case 'FLUSH':
      return `${cardRankDescription(first ?? 0)}-high Flush`;
    case 'STRAIGHT':
      return `${cardRankDescription(first ?? 0)}-high Straight`;
    case 'THREE_OF_A_KIND':
      return `Three of a Kind, ${pluralDescription(first ?? 0)}`;
    case 'TWO_PAIR':
      return `Two Pair, ${pluralDescription(first ?? 0)} and ${pluralDescription(second ?? 0)}`;
    case 'ONE_PAIR':
      return `Pair of ${pluralDescription(first ?? 0)}`;
    case 'HIGH_CARD':
      return `${cardRankDescription(first ?? 0)} High`;
  }
}

export function makeCard(rank: Rank, suit: Card['suit']): Card {
  return { rank, suit };
}
