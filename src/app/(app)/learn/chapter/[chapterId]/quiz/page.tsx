import { getChapter } from '@/lib/db/queries/curriculum';
import QuizSession from '@/components/quiz/QuizSession';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ chapterId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);
  return {
    title: chapter ? `Chapter Test — ${chapter.name}` : 'Chapter Test',
  };
}

export default async function ChapterQuizPage({ params }: Props) {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);
  if (!chapter) notFound();

  return (
    <QuizSession
      chapterId={chapterId}
      quizTitle={`${chapter.name} - Chapter Final`}
    />
  );
}
