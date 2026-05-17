'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CoachingAdvice } from '@river/engine';
import { cn } from '@/lib/utils';

type CoachingCardProps = {
  advice: CoachingAdvice;
  onDismiss: () => void;
};

const qualityClass: Record<CoachingAdvice['quality'], string> = {
  GOOD: 'border-emerald-400',
  NEUTRAL: 'border-blue-400',
  BAD: 'border-red-400',
};

export function CoachingCard({ advice, onDismiss }: CoachingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('mx-auto w-full max-w-2xl rounded-md border bg-emerald-950/95 p-3 shadow-xl', qualityClass[advice.quality])}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            {advice.quality} · Recommended {advice.recommendedAction}
          </div>
          <p className="mt-1 text-sm text-[var(--text-primary)]">{advice.explanation}</p>
          {(advice.potOdds !== undefined || advice.equity !== undefined) && (
            <div className="mt-2 flex gap-3 font-mono text-xs text-emerald-100/75">
              {advice.potOdds !== undefined && <span>Odds {advice.potOdds}%</span>}
              {advice.equity !== undefined && <span>Equity {advice.equity}%</span>}
            </div>
          )}
        </div>
        <Button type="button" size="icon" variant="ghost" aria-label="Dismiss coaching" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
