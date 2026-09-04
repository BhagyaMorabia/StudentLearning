import { getSubtopic } from '@/lib/db/queries/curriculum';
import QuizSession from '@/components/quiz/QuizSession';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ subtopicId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subtopicId } = await params;
  const subtopic = await getSubtopic(subtopicId);
  return {
    title: subtopic ? `Quiz — ${subtopic.name}` : 'Quiz',
  };
}

export default async function QuizPage({ params }: Props) {
  const { subtopicId } = await params;
  const subtopic = await getSubtopic(subtopicId);
  if (!subtopic) notFound();

  return (
    <QuizSession
      subtopicId={subtopicId}
      quizTitle={subtopic.name}
    />
  );
}
