import Link from 'next/link';
import { getFullCurriculum } from '@/lib/db/queries/curriculum';
import { Card, EmptyState } from '@/components/ui';
import { Database } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Browse JEE subjects, chapters, and subtopics. Start an AI-powered learning session.',
};

export default async function LearnPage() {
  const curriculum = await getFullCurriculum();

  if (curriculum.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <EmptyState
          icon={Database}
          title="Curriculum Not Loaded Yet"
          description="The JEE curriculum is being set up. Run the Python ingestion pipeline to populate subjects, chapters, and subtopics."
          action={
            <code className="block mt-4 text-xs font-mono bg-muted text-accent p-3 border border-border rounded-[var(--radius-sm)]">
              cd python/ingest && python 05_push_to_db.py
            </code>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">Learn</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a topic to start an AI-guided learning session
        </p>
      </div>

      {curriculum.map(({ subject, chapters }) => (
        <section key={subject.id} className="space-y-4">
          <h2 className="text-base font-semibold border-b border-border pb-2 text-foreground">{subject.name}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chapters.map(({ chapter, topics }) => (
              <Card key={chapter.id} className="space-y-3 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{chapter.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Class {chapter.classYear}</p>
                </div>
                <div className="space-y-1">
                  {topics.flatMap(({ subtopics }) =>
                    subtopics.slice(0, 3).map((subtopic) => (
                      <Link
                        key={subtopic.id}
                        href={`/learn/${subtopic.id}`}
                        className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-[var(--radius-sm)] hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <span className="h-1 w-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                        <span className="text-muted-foreground hover:text-foreground transition-colors">{subtopic.name}</span>
                      </Link>
                    )),
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
