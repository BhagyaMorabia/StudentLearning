import Link from 'next/link';
import { getFullCurriculum } from '@/lib/db/queries/curriculum';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Browse JEE subjects, chapters, and subtopics. Start an AI-powered learning session.',
};

export default async function LearnPage() {
  const curriculum = await getFullCurriculum();

  if (curriculum.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Curriculum Not Loaded Yet</h1>
        <p className="text-muted-foreground">
          The JEE curriculum is being set up. Run the Python ingestion pipeline
          to populate subjects, chapters, and subtopics.
        </p>
        <code className="mt-4 block text-sm bg-muted p-4 rounded-lg text-left">
          cd python/ingest && python 05_push_to_db.py
        </code>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learn</h1>
        <p className="text-muted-foreground mt-1">
          Choose a topic to start an AI-guided learning session
        </p>
      </div>

      {curriculum.map(({ subject, chapters }) => (
        <section key={subject.id} className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{subject.name}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chapters.map(({ chapter, topics }) => (
              <div key={chapter.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div>
                  <h3 className="font-medium">{chapter.name}</h3>
                  <p className="text-xs text-muted-foreground">Class {chapter.classYear}</p>
                </div>
                <div className="space-y-1">
                  {topics.flatMap(({ subtopics }) =>
                    subtopics.slice(0, 3).map((subtopic) => (
                      <Link
                        key={subtopic.id}
                        href={`/learn/${subtopic.id}`}
                        className="flex items-center gap-2 text-sm py-1 px-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        {subtopic.name}
                      </Link>
                    )),
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
