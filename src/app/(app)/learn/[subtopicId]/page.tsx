import { getSubtopicContext } from '@/lib/db/queries/curriculum';
import { notFound } from 'next/navigation';
import StudyPageClient from '@/components/learn/StudyPageClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ subtopicId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subtopicId } = await params;
  const context = await getSubtopicContext(subtopicId);
  if (!context) return { title: 'Not Found' };
  return {
    title: `NeuralJEE - ${context.subtopic.name}`,
    description: `Learn ${context.subtopic.name} with AI-powered JEE teaching.`,
  };
}

export default async function LearnSubtopicPage({ params }: Props) {
  const { subtopicId } = await params;
  const context = await getSubtopicContext(subtopicId);

  if (!context) notFound();

  return (
    <div className="w-full flex flex-col items-center">
      <StudyPageClient
        subtopic={context.subtopic}
        subjectName={context.subjectName}
        chapterName={context.chapterName}
        previous={context.previous}
        next={context.next}
      />
    </div>
  );
}
