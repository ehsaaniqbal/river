import { notFound } from 'next/navigation';
import { LessonPage } from '@/components/learning/LessonPage';
import { LESSONS } from '@/constants/lessons';
import type { LessonId } from '@river/engine';

type PageProps = {
  params: Promise<{ lessonId: string }>;
};

export function generateStaticParams() {
  return LESSONS.map((lesson) => ({ lessonId: lesson.id }));
}

export default async function LessonRoute({ params }: PageProps) {
  const { lessonId } = await params;
  const lesson = LESSONS.find((item) => item.id === lessonId);

  if (!lesson) {
    notFound();
  }

  return <LessonPage lessonId={lesson.id as LessonId} />;
}
