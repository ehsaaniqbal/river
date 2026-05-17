'use client';

import type { Card } from '@river/engine';
import { PlayingCard } from './PlayingCard';

type CardHandProps = {
  cards: [Card, Card] | null;
  hidden?: boolean;
  reveal?: boolean;
};

export function CardHand({ cards, hidden = false, reveal = false }: CardHandProps) {
  return (
    <div className="flex gap-1.5">
      <PlayingCard card={cards?.[0] ?? null} faceDown={hidden && !reveal} size="sm" animate={reveal} />
      <PlayingCard card={cards?.[1] ?? null} faceDown={hidden && !reveal} size="sm" animate={reveal} />
    </div>
  );
}
