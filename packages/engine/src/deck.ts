import { RANKS, SUITS, type Card } from './types';

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = shuffled[i];
    const swap = shuffled[j];

    if (current === undefined || swap === undefined) {
      throw new Error('Invalid deck index while shuffling');
    }

    shuffled[i] = swap;
    shuffled[j] = current;
  }

  return shuffled;
}

export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  if (count < 0 || count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from a ${deck.length}-card deck`);
  }

  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}
