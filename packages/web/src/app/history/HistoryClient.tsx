'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Card as PokerCard, HandHistory, PlayerAction, Street, WinnerResult } from '@river/engine';
import { getHandDescription } from '@river/engine';
import type { HandHistoryRecord, SessionUser } from '@river/shared';
import { AppHeader } from '@/components/AppHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CommunityCards } from '@/components/game/CommunityCards';
import { PlayingCard } from '@/components/game/PlayingCard';
import { fetchRiverHistory, fetchRiverStats } from '@/lib/river-api';
import { useGameStore } from '@/stores/gameStore';

type ArchiveHand = {
  id: string;
  handNumber: number;
  createdAt: number;
  heroPlayerId: string;
  players: Array<{ id: string; name: string; stackBefore?: number; stackAfter?: number }>;
  holeCards: Record<string, [PokerCard, PokerCard]>;
  streets: Array<{
    street: Street;
    communityCards: PokerCard[];
    actions: PlayerAction[];
    potAfter: number;
  }>;
  winners: WinnerResult[];
};

export default function HistoryPage() {
  const localHandHistory = useGameStore((state) => state.handHistory);
  const [serverUser, setServerUser] = useState<SessionUser | null>(null);
  const [serverHands, setServerHands] = useState<HandHistoryRecord[]>([]);
  const [selected, setSelected] = useState<ArchiveHand | null>(null);
  const hands = useMemo(() => (
    serverUser
      ? serverHands.map((hand) => archiveHandFromServer(hand, serverUser.id))
      : localHandHistory.map(archiveHandFromLocal)
  ), [localHandHistory, serverHands, serverUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (cancelled) {
        return;
      }

      const [statsResponse, historyResponse] = await Promise.all([
        fetchRiverStats(),
        fetchRiverHistory(50),
      ]);

      if (cancelled) {
        return;
      }

      setServerUser(statsResponse?.user ?? null);
      setServerHands(historyResponse?.hands ?? []);
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-5 pb-8 pt-28">
        <header className="mb-6 border-b border-emerald-100/10 pb-6">
          <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">Hands</div>
          <h1 className="mt-2 font-serif text-5xl">Hand Archive</h1>
        </header>
        <div className="grid gap-3">
          {hands.length === 0 ? (
            <Card className="border-emerald-100/15 bg-emerald-950/70 text-[var(--text-muted)]">
              <CardContent className="p-6">No hands recorded yet.</CardContent>
            </Card>
          ) : hands.map((hand) => {
            const heroResult = resultForHero(hand);
            const winningHand = hand.winners[0]?.handResult ? getHandDescription(hand.winners[0].handResult) : 'Uncontested';

            return (
              <button key={hand.id} type="button" className="text-left" onClick={() => setSelected(hand)}>
                <Card className="border-emerald-100/15 bg-emerald-950/70 text-[var(--text-primary)] hover:border-[var(--accent)]">
                  <CardContent className="grid gap-2 p-4 md:grid-cols-4">
                    <span className="font-mono">#{hand.handNumber}</span>
                    <LocalTime value={hand.createdAt} />
                    <span>{heroResult}</span>
                    <span className="text-[var(--text-muted)]">{winningHand}</span>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Hand {selected?.handNumber}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.streets.map((street) => (
                <div key={street.street} className="rounded-md border p-3">
                  <div className="mb-2 font-mono text-sm">{street.street} · Pot {street.potAfter}</div>
                  <CommunityCards cards={street.communityCards} />
                  <ul className="mt-3 space-y-1 text-sm">
                    {street.actions.map((action) => (
                      <li key={`${action.timestamp}-${action.playerId}-${action.type}`}>
                        {nameForPlayer(selected, action.playerId)}: {action.type} {action.amount > 0 ? action.amount : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(selected.holeCards).map(([playerId, cards]) => (
                  <div key={playerId} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <span className="font-mono text-sm">{nameForPlayer(selected, playerId)}</span>
                    <div className="flex gap-1">
                      <PlayingCard card={cards[0]} size="sm" />
                      <PlayingCard card={cards[1]} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function archiveHandFromServer(hand: HandHistoryRecord, heroPlayerId: string): ArchiveHand {
  return {
    id: hand.id,
    handNumber: hand.handNumber,
    createdAt: hand.createdAt,
    heroPlayerId,
    players: hand.players,
    holeCards: hand.holeCards,
    streets: hand.streets,
    winners: hand.winners,
  };
}

function archiveHandFromLocal(hand: HandHistory): ArchiveHand {
  return {
    id: `local-${hand.handNumber}-${hand.timestamp}`,
    handNumber: hand.handNumber,
    createdAt: hand.timestamp,
    heroPlayerId: 'hero',
    players: hand.players.map((player) => ({
      id: player.id,
      name: player.name,
      stackAfter: player.stack,
    })),
    holeCards: hand.holeCards,
    streets: hand.streets,
    winners: hand.winners,
  };
}

function nameForPlayer(hand: ArchiveHand, playerId: string): string {
  return hand.players.find((player) => player.id === playerId)?.name ?? playerId;
}

function resultForHero(hand: ArchiveHand): string {
  const heroDelta = deltaForHero(hand);

  if (heroDelta !== null) {
    return heroDelta >= 0 ? `Won ${heroDelta}` : `Lost ${Math.abs(heroDelta)}`;
  }

  const won = hand.winners.filter((winner) => winner.playerId === hand.heroPlayerId).reduce((sum, winner) => sum + winner.amount, 0);
  return won > 0 ? `Won ${won}` : 'Lost';
}

function deltaForHero(hand: ArchiveHand): number | null {
  const hero = hand.players.find((player) => player.id === hand.heroPlayerId);

  if (!hero || hero.stackBefore === undefined || hero.stackAfter === undefined) {
    return null;
  }

  return hero.stackAfter - hero.stackBefore;
}

function LocalTime({ value }: { value: number }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    setLabel(new Date(value).toLocaleString());
  }, [value]);

  return <span>{label}</span>;
}
