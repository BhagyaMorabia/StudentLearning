import { getFullCurriculum } from '@/lib/db/queries/curriculum';
import { EmptyState } from '@/components/ui';
import type { Metadata } from 'next';
import CurriculumView from '@/components/learn/CurriculumView';

export const metadata: Metadata = {
  title: 'NeuralJEE - Curriculum Browser',
  description: 'Explore the complete JEE syllabus structured for high-density learning.',
};

export default async function LearnPage() {
  const curriculum = await getFullCurriculum();

  if (curriculum.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6">
        <EmptyState
          icon="database"
          title="Curriculum not loaded yet"
          description="The JEE curriculum is being set up. Run the Python ingestion pipeline to populate subjects, chapters, and subtopics."
          action={
            <code className="block mt-4 text-[12px] font-label-mono bg-surface-container text-primary p-3 border border-surface-stroke rounded">
              cd python/ingest && python 05_push_to_db.py
            </code>
          }
        />
      </div>
    );
  }
  return <CurriculumView curriculum={curriculum} />;
}
