'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '@river/engine';
import { cn } from '@/lib/utils';

type PlayingCardProps = {
  card: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  highlighted?: boolean;
};

const suitSymbol: Record<Card['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const suitName: Record<Card['suit'], string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};

const rankName: Record<Card['rank'], string> = {
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  T: 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
  A: 'Ace',
};

const sizeClass = {
  sm: 'h-14 w-10 text-sm',
  md: 'h-[90px] w-16 text-base',
  lg: 'h-28 w-20 text-lg',
};

function cardLabel(card: Card | null, faceDown: boolean): string {
  if (!card || faceDown) {
    return 'Face-down card';
  }

  return `${rankName[card.rank]} of ${suitName[card.suit]}`;
}

function PlayingCardComponent({ card, faceDown = false, size = 'md', animate = false, highlighted = false }: PlayingCardProps) {
  const hidden = !card || faceDown;
  const red = card?.suit === 'hearts' || card?.suit === 'diamonds';

  return (
    <motion.div
      aria-label={cardLabel(card, hidden)}
      initial={animate ? { rotateY: 90, opacity: 0 } : false}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md border shadow-lg [transform-style:preserve-3d] will-change-transform',
        sizeClass[size],
        hidden
          ? 'border-emerald-950 bg-[repeating-linear-gradient(45deg,#0d2318_0_6px,#173b2c_6px_12px)]'
          : 'border-zinc-200 bg-[var(--card-bg)]',
        highlighted && 'shadow-[0_0_22px_var(--accent)] ring-2 ring-[var(--accent)]',
      )}
    >
      {hidden ? (
        <div className="absolute inset-1 rounded border border-amber-300/30" />
      ) : (
        <div className={cn('flex h-full flex-col justify-between p-1.5 font-semibold', red ? 'text-red-700' : 'text-zinc-950')}>
          <div className="leading-none">
            <div>{card.rank}</div>
            <div>{suitSymbol[card.suit]}</div>
          </div>
          <div className="self-center text-3xl leading-none">{suitSymbol[card.suit]}</div>
          <div className="rotate-180 self-end leading-none">
            <div>{card.rank}</div>
            <div>{suitSymbol[card.suit]}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export const PlayingCard = memo(PlayingCardComponent);
