'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CommunityCards } from '@/components/game/CommunityCards';
import { PlayingCard } from '@/components/game/PlayingCard';
import { getHandDescription } from '@river/engine';
import { useGameStore } from '@/stores/gameStore';
import type { HandHistory } from '@river/engine';

export default function HistoryPage() {
  const handHistory = useGameStore((state) => state.handHistory);
  const [selected, setSelected] = useState<HandHistory | null>(null);

  return (
    <main className="min-h-screen bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-5 pb-8 pt-28">
        <header className="mb-6 border-b border-emerald-100/10 pb-6">
          <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--accent)]">Hands</div>
          <h1 className="mt-2 font-serif text-5xl">Hand Archive</h1>
        </header>
        <div className="grid gap-3">
          {handHistory.length === 0 ? (
            <Card className="border-emerald-100/15 bg-emerald-950/70 text-[var(--text-muted)]">
              <CardContent className="p-6">No hands recorded yet.</CardContent>
            </Card>
          ) : handHistory.map((hand) => {
            const heroWin = hand.winners.filter((winner) => winner.playerId === 'hero').reduce((sum, winner) => sum + winner.amount, 0);
            const winningHand = hand.winners[0]?.handResult ? getHandDescription(hand.winners[0].handResult) : 'Uncontested';

            return (
              <button key={`${hand.handNumber}-${hand.timestamp}`} type="button" className="text-left" onClick={() => setSelected(hand)}>
                <Card className="border-emerald-100/15 bg-emerald-950/70 text-[var(--text-primary)] hover:border-[var(--accent)]">
                  <CardContent className="grid gap-2 p-4 md:grid-cols-4">
                    <span className="font-mono">#{hand.handNumber}</span>
                    <span>{new Date(hand.timestamp).toLocaleString()}</span>
                    <span>{heroWin > 0 ? `Won ${heroWin}` : 'Lost'}</span>
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
                        {action.playerId}: {action.type} {action.amount > 0 ? action.amount : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(selected.holeCards).map(([playerId, cards]) => (
                  <div key={playerId} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <span className="font-mono text-sm">{playerId}</span>
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
