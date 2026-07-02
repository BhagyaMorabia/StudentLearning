import { getSubtopic } from '@/lib/db/queries/curriculum';
import { notFound } from 'next/navigation';
import TeachingPanel from '@/components/learn/TeachingPanel';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ subtopicId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subtopicId } = await params;
  const subtopic = await getSubtopic(subtopicId);
  if (!subtopic) return { title: 'Not Found' };
  return {
    title: subtopic.name,
    description: `Learn ${subtopic.name} with AI-powered JEE teaching. Verified formulas, worked examples, and spaced repetition.`,
  };
}

export default async function LearnSubtopicPage({ params }: Props) {
  const { subtopicId } = await params;
  const subtopic = await getSubtopic(subtopicId);

  if (!subtopic) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/learn" className="hover:text-foreground transition-colors">
          Learn
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{subtopic.name}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">{subtopic.name}</h1>
          {subtopic.description && (
            <p className="text-sm text-muted-foreground mt-1">{subtopic.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-[13px] text-muted-foreground">
            <span>~{subtopic.estimatedMinutes} min</span>
            {(subtopic.pyqFrequency ?? 0) > 0 && (
              <span>{subtopic.pyqFrequency} PYQ questions</span>
            )}
          </div>
        </div>

        <Link href={`/learn/${subtopicId}/quiz`} className="shrink-0">
          <Button variant="primary" size="md">
            Take Quiz <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {/* AI Teaching Panel — streams content from /api/ai/teach */}
      <TeachingPanel subtopicId={subtopicId} subtopicName={subtopic.name} />
    </div>
  );
}
