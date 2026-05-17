'use client';

import { evaluateBestHand, getHandDescription } from '@river/engine';
import { HAND_RANK_VALUE, type Card } from '@river/engine';

type HandStrengthMeterProps = {
  holeCards: [Card, Card] | null;
  communityCards: Card[];
};

export function HandStrengthMeter({ holeCards, communityCards }: HandStrengthMeterProps) {
  if (!holeCards || communityCards.length < 3) {
    return null;
  }

  const result = evaluateBestHand(holeCards, communityCards);
  const percent = Math.max(8, ((HAND_RANK_VALUE[result.rank] + 1) / 10) * 100);

  return (
    <div className="w-full max-w-xs rounded-md border border-emerald-100/15 bg-emerald-950/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-[var(--text-muted)]">Hand Strength</span>
        <span className="text-amber-100">{getHandDescription(result)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-emerald-950">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
