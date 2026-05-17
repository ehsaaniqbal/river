'use client';

import { memo } from 'react';
import type { Pot } from '@river/engine';
import { ChipStack } from './ChipStack';

type PotDisplayProps = {
  pots: Pot[];
};

function PotDisplayComponent({ pots }: PotDisplayProps) {
  const total = pots.reduce((sum, pot) => sum + pot.amount, 0);

  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite">
      <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Pot</span>
      <ChipStack amount={total} />
      {pots.length > 1 && (
        <div className="flex gap-1 text-[10px] text-emerald-100/70">
          {pots.map((pot, index) => (
            <span key={index}>P{index + 1}: {pot.amount}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export const PotDisplay = memo(PotDisplayComponent);
