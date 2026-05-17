'use client';

import { motion } from 'framer-motion';
import type { Card } from '@river/engine';
import { PlayingCard } from './PlayingCard';

type CommunityCardsProps = {
  cards: Card[];
};

export function CommunityCards({ cards }: CommunityCardsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: 5 }, (_, index) => {
        const card = cards[index] ?? null;

        return (
          <motion.div
            key={card ? `${card.rank}-${card.suit}` : `slot-${index}`}
            initial={card ? { opacity: 0, y: -8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {card ? (
              <PlayingCard card={card} size="md" animate />
            ) : (
              <div className="h-[90px] w-16 rounded-md border border-dashed border-emerald-100/25 bg-emerald-950/20" aria-label="Empty community card slot" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
