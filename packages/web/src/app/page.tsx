'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CirclePlay } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { HeroProductScene } from '@/components/landing/HeroProductScene';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useGameStore } from '@/stores/gameStore';
import type { BotDifficulty } from '@river/engine';

export default function Home() {
  const router = useRouter();
  const initGame = useGameStore((state) => state.initGame);
  const coachingEnabled = useGameStore((state) => state.coachingEnabled);
  const toggleCoaching = useGameStore((state) => state.toggleCoaching);
  const [numBots, setNumBots] = useState('3');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('INTERMEDIATE');
  const [startingStack, setStartingStack] = useState('1000');
  const [blinds, setBlinds] = useState('5/10');
  const [heroDecision, setHeroDecision] = useState<'check' | 'bet' | null>(null);

  const startPractice = () => {
    const [smallBlind, bigBlind] = blinds.split('/').map(Number);

    initGame({
      numBots: Number(numBots),
      difficulty,
      startingStack: Number(startingStack),
      blinds: {
        small: smallBlind ?? 5,
        big: bigBlind ?? 10,
      },
    });
    router.push('/play');
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />

      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-5 pb-10 pt-28 lg:px-8">
        <HeroProductScene />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(245,240,232,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(245,240,232,0.06)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-10rem)] max-w-7xl items-center">
          <div className="max-w-2xl">
            <h1 className="max-w-3xl font-serif text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              Read the table.
              <br />
              Take the pot.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
              Play poker, learn the rules, and practice real decisions — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger className="group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-[7px] border border-[#f5dc79]/70 bg-[#d8b64b] px-5 text-sm font-medium text-[#07110d] shadow-[0_18px_44px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,255,255,0.07),inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_0_rgba(77,58,9,0.38)] outline-none transition-colors before:absolute before:inset-0 before:bg-[linear-gradient(180deg,#ffe99a_0%,#e5c761_46%,#b99535_100%)] before:transition-opacity after:absolute after:inset-x-2 after:top-px after:h-px after:bg-white/65 hover:before:opacity-95 focus-visible:ring-2 focus-visible:ring-[#f5dc79]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110d] active:bg-[#c9a642]">
                  <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.46)_46%,transparent_62%)] opacity-0 transition-opacity group-hover:opacity-40" />
                  <CirclePlay className="relative z-10 mr-2 h-4 w-4" />
                  <span className="relative z-10">Sit In</span>
                </DialogTrigger>
                <DialogContent className="!max-w-xl rounded-md border-emerald-100/15 bg-[#10261c] p-6 text-[var(--text-primary)]">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl">Practice Setup</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-5">
                    <label className="grid gap-2 text-sm text-[var(--text-muted)]">
                      <span>Number of bots</span>
                      <Select value={numBots} onValueChange={(value) => value !== null && setNumBots(value)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <fieldset className="grid gap-2">
                      <legend className="text-sm text-[var(--text-muted)]">Bot difficulty</legend>
                      <RadioGroup value={difficulty} onValueChange={(value) => setDifficulty(value as BotDifficulty)} className="grid gap-2 sm:grid-cols-3">
                        {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => (
                          <label
                            key={level}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-emerald-100/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]/45 hover:bg-white/[0.065]"
                          >
                            <RadioGroupItem value={level} className="pointer-events-none" />
                            <span>{level}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </fieldset>
                    <label className="grid gap-2 text-sm text-[var(--text-muted)]">
                      <span>Starting stack</span>
                      <Select value={startingStack} onValueChange={(value) => value !== null && setStartingStack(value)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500">500</SelectItem>
                          <SelectItem value="1000">1000</SelectItem>
                          <SelectItem value="2000">2000</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="grid gap-2 text-sm text-[var(--text-muted)]">
                      <span>Blinds</span>
                      <Select value={blinds} onValueChange={(value) => value !== null && setBlinds(value)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5/10">5/10</SelectItem>
                          <SelectItem value="10/20">10/20</SelectItem>
                          <SelectItem value="25/50">25/50</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="flex items-center justify-between rounded-md border border-emerald-100/10 px-3 py-2 text-sm">
                      Coaching mode
                      <Switch checked={coachingEnabled} onCheckedChange={toggleCoaching} />
                    </label>
                    <Button onClick={startPractice}>Start</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Link
                href="/learn"
                className="relative inline-flex h-11 items-center justify-center overflow-hidden rounded-[7px] border border-white/14 bg-[#101b16]/70 px-5 text-sm font-medium text-[#f7f0df] shadow-[0_16px_38px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.035),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.45)] outline-none backdrop-blur-2xl transition-colors before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.035)_48%,rgba(255,255,255,0.06))] after:absolute after:inset-x-2 after:top-px after:h-px after:bg-white/25 hover:border-[#e8c96a]/48 hover:bg-[#16231d]/80 focus-visible:ring-2 focus-visible:ring-[#e8c96a]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110d] active:bg-[#0c1712]"
              >
                <span className="relative z-10">Study First</span>
              </Link>
            </div>
            <div className="hero-readout hero-art-panel mt-10 max-w-xl overflow-hidden rounded-[10px] border border-emerald-100/12 bg-[#06110d]/42 p-5 shadow-[0_26px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]">
              <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wide text-emerald-50/52">
                <span>Your Decision</span>
                <span>Villain checks</span>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_11.5rem]">
                <div className={`hero-mini-table relative min-h-52 overflow-hidden rounded-[14px] border border-emerald-100/10 bg-[#10251a]/54 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${heroDecision === 'bet' ? 'hero-mini-table-bet' : ''} ${heroDecision === 'check' ? 'hero-mini-table-check' : ''}`}>
                  <div className="absolute inset-5 rounded-[50%] border border-emerald-100/10 bg-[radial-gradient(ellipse_at_center,rgba(36,81,62,0.72),rgba(8,21,16,0.42)_62%,rgba(3,8,6,0.08)_100%)] shadow-[inset_0_0_58px_rgba(0,0,0,0.38)]" />
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="rounded-md border border-white/10 bg-black/18 px-3 py-2">
                      <div className="mt-1 text-sm text-emerald-50/88">Villain</div>
                      <div className="mt-1 font-mono text-[10px] text-[var(--accent)]">{heroDecision === 'bet' ? 'calls' : 'checks'}</div>
                      {heroDecision && (
                        <div className="hero-villain-reveal mt-2 flex gap-1">
                          {['K♣', 'J♦'].map((card) => (
                            <span key={card} className="flex h-7 w-5 items-center justify-center rounded-[3px] bg-[#f5f0e8] font-mono text-[9px] font-semibold text-[#07110d]">
                              {card}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="hero-chip-stack mt-2 flex items-center gap-1">
                      <span />
                      <span />
                      <span />
                      {heroDecision === 'bet' && (
                        <>
                          <span className="hero-action-chip" />
                          <span className="hero-action-chip" />
                        </>
                      )}
                      <div className="ml-2 font-mono text-[10px] uppercase tracking-wide text-emerald-50/54">Pot {heroDecision === 'bet' ? '$360' : '$180'}</div>
                    </div>
                  </div>
                  <div className="relative z-10 mt-9 flex justify-center gap-2">
                    {['A♣', 'K♦', '7♠', '4♥', '2♣'].map((card) => (
                      <span
                        key={card}
                        className="flex h-11 w-8 items-center justify-center rounded-[5px] border border-white/12 bg-white/[0.09] font-mono text-xs text-emerald-50/88 shadow-[0_10px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
                      >
                        {card}
                      </span>
                    ))}
                  </div>
                  <div className="relative z-10 mt-8 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#07110d]">You</span>
                      <div>
                        <div className="text-sm text-emerald-50/88">Hero</div>
                        <div className="font-mono text-[10px] text-emerald-50/48">top pair</div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      {['A♥', 'Q♥'].map((card) => (
                        <span
                          key={card}
                          className="hero-art-card flex h-[4.3rem] w-12 items-center justify-center rounded-[7px] bg-[#f5f0e8] font-mono text-lg font-semibold text-[#07110d] shadow-[0_20px_44px_rgba(0,0,0,0.34),0_0_34px_rgba(232,201,106,0.13),inset_0_1px_0_rgba(255,255,255,0.82)]"
                        >
                          {card}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative self-stretch">
                  <div>
                    <div className="font-serif text-3xl leading-none text-[var(--text-primary)]">Top pair.</div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                      The pot is yours to pressure or protect.
                    </p>
                  </div>
                  <div className="mt-5 grid gap-2">
                    <button
                      type="button"
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${heroDecision === 'check' ? 'border-[var(--accent)]/45 bg-[var(--accent)]/10 shadow-[0_0_34px_rgba(232,201,106,0.1)]' : 'border-white/10 bg-white/[0.045] hover:border-[var(--accent)]/35 hover:bg-white/[0.07]'}`}
                      onClick={() => setHeroDecision('check')}
                    >
                      <div className="font-mono text-[9px] uppercase tracking-wide text-emerald-50/42">Check</div>
                      <div className="mt-1 text-sm text-emerald-50/72">see showdown</div>
                    </button>
                    <button
                      type="button"
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${heroDecision === 'bet' ? 'border-[var(--accent)]/55 bg-[var(--accent)]/12 shadow-[0_0_38px_rgba(232,201,106,0.14)]' : 'border-[var(--accent)]/30 bg-[var(--accent)]/7 hover:border-[var(--accent)]/55 hover:bg-[var(--accent)]/12'}`}
                      onClick={() => setHeroDecision('bet')}
                    >
                      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wide text-[var(--accent)]">
                        <span>Bet</span>
                        <span>$90</span>
                      </div>
                      <div className="hero-readout-meter mt-2 h-[3px] rounded-full bg-emerald-100/14">
                        <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,#8f7b36,#e8c96a,#fff0aa)] shadow-[0_0_24px_rgba(232,201,106,0.42)]" />
                      </div>
                    </button>
                  </div>
                  <div className="mt-3 min-h-12 text-xs leading-5 text-[var(--text-muted)]">
                    {!heroDecision && <p>Pick a line. Learn why it wins or leaks chips.</p>}
                    {heroDecision === 'check' && (
                      <p className="hero-result-reveal">
                        Villain shows K♣ J♦. Your pair of aces wins the $180 pot.
                      </p>
                    )}
                    {heroDecision === 'bet' && (
                      <p className="hero-result-reveal text-emerald-50/82">
                        Villain calls with K♣ J♦. Your value bet earns $90 more.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
