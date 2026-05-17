'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

type ChipStackProps = {
  amount: number;
  compact?: boolean;
};

function ChipStackComponent({ amount, compact = false }: ChipStackProps) {
  const chips = Math.min(5, Math.max(1, Math.ceil(amount / 100)));

  return (
    <div className="flex items-center gap-1" aria-label={`${amount} chips`}>
      <div className={cn('relative', compact ? 'h-4 w-6' : 'h-5 w-8')}>
        {Array.from({ length: chips }, (_, index) => (
          <span
            key={index}
            className={cn(
              'absolute left-0 rounded-full border border-amber-200/70 bg-[var(--chip-gold)] shadow-sm',
              compact ? 'h-2.5 w-6' : 'h-3 w-8',
            )}
            style={{ bottom: index * 3 }}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-amber-100">{amount}</span>
    </div>
  );
}

export const ChipStack = memo(ChipStackComponent);
