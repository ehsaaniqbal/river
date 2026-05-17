'use client';

import { memo, useEffect, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import type { Player } from '@river/engine';
import { cn } from '@/lib/utils';
import { CardHand } from './CardHand';

type PlayerSeatProps = {
  player: Player;
  totalSeats: number;
  active?: boolean;
  showCards?: boolean;
  connection?: {
    connected: boolean;
    disconnectDeadline: number | null;
  };
};

function seatPosition(seatIndex: number, totalSeats: number): { x: number; y: number } {
  if (seatIndex === 0) {
    return { x: 50, y: 88 };
  }

  const angle = -Math.PI / 2 + ((seatIndex - 1) / Math.max(totalSeats - 1, 1)) * Math.PI * 1.75;
  const x = 50 + Math.cos(angle) * 42;
  const y = 50 + Math.sin(angle) * 38;

  return { x, y };
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function actionLabel(player: Player): string | null {
  if (player.isFolded) {
    return 'FOLD';
  }

  if (player.isAllIn) {
    return 'ALL-IN';
  }

  if (player.currentBet > 0) {
    return String(player.currentBet);
  }

  return null;
}

function PlayerSeatComponent({ player, totalSeats, active = false, showCards = false, connection }: PlayerSeatProps) {
  const position = seatPosition(player.seatIndex, totalSeats);
  const label = actionLabel(player);
  const [now, setNow] = useState(() => Date.now());
  const disconnected = connection ? !connection.connected : false;
  const countdown = connection?.disconnectDeadline
    ? Math.max(0, Math.ceil((connection.disconnectDeadline - now) / 1000))
    : null;

  useEffect(() => {
    if (!connection?.disconnectDeadline || connection.connected) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 500);

    return () => window.clearInterval(interval);
  }, [connection?.connected, connection?.disconnectDeadline]);

  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <CardHand cards={player.holeCards} hidden={!player.isHuman} reveal={showCards || player.isHuman} />
      <div className={cn('min-w-32 rounded-md border bg-emerald-950/85 p-2 text-center shadow-xl shadow-black/25 backdrop-blur', active ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/50' : 'border-emerald-100/15')}>
        <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-full bg-[var(--felt-light)] text-xs font-semibold text-[var(--text-primary)]">
          {initials(player.name)}
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {connection && (
            <span
              className={cn(
                'size-2 rounded-full',
                connection.connected && 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]',
                disconnected && countdown === null && 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]',
                disconnected && countdown !== null && 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.55)]',
              )}
              aria-label={connection.connected ? 'Connected' : 'Disconnected'}
            />
          )}
          <div className="max-w-28 truncate text-sm font-semibold text-[var(--text-primary)]">{player.name}</div>
        </div>
        <div className="font-mono text-xs text-[var(--text-muted)]">{player.position} · {player.stack}</div>
        {disconnected && (
          <div className="mt-1 font-mono text-[10px] text-red-100">
            {countdown !== null ? `FOLD ${countdown}s` : 'OFFLINE'}
          </div>
        )}
        <LazyMotion features={domAnimation}>
          <AnimatePresence>
            {label && (
              <m.div
                key={label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mt-1 rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-100"
              >
                {label}
              </m.div>
            )}
          </AnimatePresence>
        </LazyMotion>
      </div>
    </div>
  );
}

export const PlayerSeat = memo(PlayerSeatComponent);
