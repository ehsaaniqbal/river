'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { GameState } from '@river/engine';
import { getHandDescription } from '@river/engine';

type WinnerOverlayProps = {
  state: GameState;
  onDismiss: () => void;
};

export function WinnerOverlay({ state, onDismiss }: WinnerOverlayProps) {
  if (state.phase !== 'HAND_COMPLETE' || state.winners.length === 0) {
    return null;
  }

  const primaryWinner = state.winners[0];
  const player = state.players.find((seat) => seat.id === primaryWinner?.playerId);
  const handDescription = primaryWinner?.handResult ? getHandDescription(primaryWinner.handResult) : 'Uncontested pot';

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-6 text-left backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          className="rounded-md border border-[var(--accent)] bg-emerald-950/95 p-6 text-center shadow-[0_0_34px_rgba(232,201,106,0.35)]"
        >
          <div className="text-sm uppercase tracking-wide text-[var(--text-muted)]">Winner</div>
          <div className="mt-1 font-serif text-3xl text-[var(--text-primary)]">{player?.name ?? 'Player'}</div>
          <div className="mt-2 font-mono text-lg text-[var(--accent)]">+{primaryWinner?.amount ?? 0}</div>
          <div className="mt-3 text-sm text-emerald-100/85">{handDescription}</div>
        </motion.div>
      </motion.button>
    </AnimatePresence>
  );
}
