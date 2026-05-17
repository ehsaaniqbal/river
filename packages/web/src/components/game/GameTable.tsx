'use client';

import { useCallback, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoachingCard } from '@/components/coaching/CoachingCard';
import { getLegalActions } from '@river/engine';
import { useGameStore } from '@/stores/gameStore';
import type { ActionType, BotDifficulty } from '@river/engine';
import { ActionButtons } from './ActionButtons';
import { CommunityCards } from './CommunityCards';
import { HandStrengthMeter } from './HandStrengthMeter';
import { PlayerSeat } from './PlayerSeat';
import { PotDisplay } from './PotDisplay';
import { WinnerOverlay } from './WinnerOverlay';

type DefaultConfig = {
  numBots: number;
  difficulty: BotDifficulty;
  startingStack: number;
  blinds: { small: number; big: number };
};

const defaultConfig: DefaultConfig = {
  numBots: 3,
  difficulty: 'INTERMEDIATE',
  startingStack: 1000,
  blinds: { small: 5, big: 10 },
};

export function GameTable() {
  const gameState = useGameStore((state) => state.gameState);
  const initGame = useGameStore((state) => state.initGame);
  const executeAction = useGameStore((state) => state.executeAction);
  const nextHand = useGameStore((state) => state.nextHand);
  const advice = useGameStore((state) => state.lastCoachingAdvice);
  const [showWinner, setShowWinner] = useState(true);
  const [coachingDismissed, setCoachingDismissed] = useState(false);

  const handleAction = useCallback(async (action: ActionType, amount?: number) => {
    setShowWinner(true);
    setCoachingDismissed(false);
    await executeAction(action, amount);
  }, [executeAction]);

  if (!gameState) {
    return (
      <div className="flex min-h-[720px] items-center justify-center bg-[#0D1F17] p-6 text-[var(--text-primary)]">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-5xl">River</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Take a seat, play the hand, and check the line when the decision is close.
          </p>
          <Button className="mt-6" onClick={() => initGame(defaultConfig)}>
            <Sparkles className="size-4" />
            Start Practice
          </Button>
        </div>
      </div>
    );
  }

  const legal = getLegalActions(gameState);
  const hero = gameState.players.find((player) => player.isHuman);

  return (
    <div className="min-h-screen bg-[#0D1F17] px-4 py-3 text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <header className="flex items-center justify-between gap-4 border-b border-emerald-100/10 pb-3">
          <div>
            <h1 className="font-serif text-4xl leading-none">River</h1>
            <div className="font-mono text-xs text-[var(--text-muted)]">
              Hand {gameState.handNumber} · {gameState.street} · {gameState.smallBlind}/{gameState.bigBlind}
            </div>
          </div>
          <Button type="button" variant="secondary" className="rounded-md" onClick={nextHand} disabled={gameState.phase !== 'HAND_COMPLETE'}>
            <RotateCcw className="size-4" />
            Next Hand
          </Button>
        </header>

        <section className="relative min-h-[760px] overflow-hidden rounded-md border border-emerald-100/10 bg-[#10261c] shadow-2xl shadow-black/30">
          <div className="absolute inset-x-7 top-12 bottom-10 rounded-[50%] border-[18px] border-[var(--table-border)] bg-[radial-gradient(circle_at_center,var(--felt-light),var(--felt)_62%,#10261c)] shadow-[inset_0_20px_80px_rgba(0,0,0,0.3)]" />
          <div className="absolute inset-x-7 top-12 bottom-10 rounded-[50%] opacity-20 [background-image:repeating-linear-gradient(60deg,transparent_0_8px,rgba(255,255,255,0.08)_8px_9px)]" />

          <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5">
            <PotDisplay pots={gameState.pots} />
            <CommunityCards cards={gameState.communityCards} />
          </div>

          {gameState.players.map((player) => (
            <PlayerSeat
              key={player.id}
              player={player}
              totalSeats={gameState.players.length}
              active={gameState.players[gameState.currentPlayerIndex]?.id === player.id}
              showCards={gameState.phase === 'HAND_COMPLETE'}
            />
          ))}

          {showWinner && (
            <WinnerOverlay state={gameState} onDismiss={() => setShowWinner(false)} />
          )}
        </section>

        <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-3">
            <HandStrengthMeter holeCards={hero?.holeCards ?? null} communityCards={gameState.communityCards} />
          </div>
          <div className="flex flex-col gap-3">
            {advice && !coachingDismissed && (
              <CoachingCard advice={advice} onDismiss={() => setCoachingDismissed(true)} />
            )}
            <ActionButtons state={gameState} legal={legal} onAction={handleAction} />
          </div>
        </div>
      </div>
    </div>
  );
}
