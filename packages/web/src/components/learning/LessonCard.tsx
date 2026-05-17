'use client';

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import type { LessonMetadata } from '@/constants/lessons';

type LessonCardProps = {
  lesson: LessonMetadata;
  completed?: boolean;
};

export function LessonCard({ lesson, completed = false }: LessonCardProps) {
  return (
    <Link
      href={`/learn/${lesson.id}`}
      className="liquid-glass-quiet group grid grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-md p-4 transition-colors hover:border-[var(--accent)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.055] font-mono text-sm text-[var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        {String(lesson.order).padStart(2, '0')}
      </div>
      <div>
        <div className="font-serif text-2xl text-[var(--text-primary)]">{lesson.title}</div>
        <div className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{lesson.description}</div>
      </div>
      <div className="text-[var(--accent)]">
        {completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 opacity-40 group-hover:opacity-100" />}
      </div>
    </Link>
  );
}
