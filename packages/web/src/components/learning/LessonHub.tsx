'use client';

import { AppHeader } from '@/components/AppHeader';
import { LESSONS } from '@/constants/lessons';
import { useGameStore } from '@/stores/gameStore';
import { LessonCard } from './LessonCard';

export function LessonHub() {
  const lessonProgress = useGameStore((state) => state.lessonProgress);
  const completedIds = new Set(lessonProgress.filter((progress) => progress.completed).map((progress) => progress.lessonId));
  const completed = completedIds.size;
  const percent = Math.round((completed / LESSONS.length) * 100);

  return (
    <main className="min-h-screen bg-[#06110d] text-[var(--text-primary)]">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-28">
        <section className="grid gap-6 border-b border-emerald-100/10 pb-8 lg:grid-cols-[1fr_22rem]">
          <div>
            <h1 className="max-w-3xl font-serif text-5xl leading-[0.95] sm:text-6xl">Study the spots that decide pots.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Start with hand strength and position, then move into price, texture, sizing, bluffs, and bankroll discipline.
            </p>
          </div>
          <div className="self-end lg:justify-self-end lg:text-right">
            <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Syllabus</div>
            <div className="mt-2 flex items-baseline gap-3 lg:justify-end">
              <span className="font-serif text-3xl leading-none text-[var(--text-primary)]">{percent}%</span>
              <span className="text-sm text-[var(--text-muted)]">{completed}/{LESSONS.length} passed</span>
            </div>
            <div className="mt-4 h-px w-44 overflow-hidden bg-emerald-100/12 lg:ml-auto">
              <div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </section>
        <section className="grid gap-3 py-8">
          {LESSONS.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} completed={completedIds.has(lesson.id)} />
          ))}
        </section>
      </div>
    </main>
  );
}
