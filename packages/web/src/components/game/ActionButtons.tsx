'use client';

import { useCallback, useState } from 'react';
import { CircleDollarSign, Hand, OctagonX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ActionType, GameState } from '@river/engine';
import type { LegalActions } from '@river/engine';
import { BetSlider } from './BetSlider';

type ActionButtonsProps = {
  state: GameState;
  legal: LegalActions;
  onAction: (action: ActionType, amount?: number) => Promise<void>;
};

export function ActionButtons({ state, legal, onAction }: ActionButtonsProps) {
  const [sliderOpen, setSliderOpen] = useState(false);
  const initialAmount = legal.canRaise ? legal.minRaise : legal.minBet;
  const [amount, setAmount] = useState(initialAmount);
  const currentPlayer = state.players[state.currentPlayerIndex];

  const submitAction = useCallback(async (action: ActionType, actionAmount?: number) => {
    await onAction(action, actionAmount);
    setSliderOpen(false);
  }, [onAction]);

  if (!currentPlayer?.isHuman || state.phase === 'HAND_COMPLETE') {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      {sliderOpen && (
        <BetSlider state={state} legal={legal} value={amount} onChange={setAmount} />
      )}
      <div className="grid grid-cols-3 gap-3 rounded-md border border-emerald-100/10 bg-emerald-950/45 p-2 shadow-xl shadow-black/15">
        <Button
          type="button"
          aria-label="Fold"
          variant="destructive"
          disabled={!legal.canFold}
          onClick={() => void submitAction('FOLD')}
        >
          <OctagonX className="size-4" />
          Fold
        </Button>
        {legal.canCheck ? (
          <Button
            type="button"
            aria-label="Check"
            variant="secondary"
            onClick={() => void submitAction('CHECK')}
          >
            <Hand className="size-4" />
            Check
          </Button>
        ) : (
          <Button
            type="button"
            aria-label={`Call ${legal.callAmount}`}
            variant="secondary"
            disabled={!legal.canCall}
            onClick={() => void submitAction('CALL')}
          >
            <Hand className="size-4" />
            Call {legal.callAmount}
          </Button>
        )}
        <Button
          type="button"
          aria-label={legal.canRaise ? 'Raise' : 'Bet'}
          disabled={!legal.canBet && !legal.canRaise}
          onClick={() => {
            if (sliderOpen) {
              void submitAction(legal.canRaise ? 'RAISE' : 'BET', amount);
            } else {
              setAmount(initialAmount);
              setSliderOpen(true);
            }
          }}
        >
          <CircleDollarSign className="size-4" />
          {sliderOpen ? 'Confirm' : legal.canRaise ? 'Raise' : 'Bet'}
        </Button>
      </div>
    </div>
  );
}
