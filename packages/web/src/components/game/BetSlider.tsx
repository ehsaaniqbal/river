'use client';

import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import type { GameState } from '@river/engine';
import type { LegalActions } from '@river/engine';

type BetSliderProps = {
  state: GameState;
  legal: LegalActions;
  value: number;
  onChange: (value: number) => void;
};

export function BetSlider({ state, legal, value, onChange }: BetSliderProps) {
  const min = legal.canRaise ? legal.minRaise : legal.minBet;
  const max = legal.canRaise ? legal.maxRaise : legal.maxBet;
  const step = state.bigBlind;
  const pot = state.players.reduce((sum, player) => sum + player.totalInvested, 0);
  const quickBets = useMemo(() => [
    { label: '1/2 Pot', value: Math.round(pot * 0.5) },
    { label: '3/4 Pot', value: Math.round(pot * 0.75) },
    { label: 'Pot', value: pot },
    { label: 'All-In', value: max },
  ], [max, pot]);

  return (
    <div className="rounded-md border border-emerald-100/15 bg-emerald-950/90 p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Amount</span>
        <span className="font-mono text-sm text-amber-100">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(nextValue) => onChange(Array.isArray(nextValue) ? nextValue[0] ?? min : nextValue)}
        aria-label="Bet amount"
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {quickBets.map((bet) => (
          <Button
            key={bet.label}
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(Math.min(Math.max(bet.value, min), max))}
          >
            {bet.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
