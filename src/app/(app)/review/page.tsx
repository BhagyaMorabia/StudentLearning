import { getDueReviews } from '@/lib/db/queries/review';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review',
  description: 'Your spaced repetition review queue — topics due for review today.',
};

export default async function ReviewPage() {
  const userId = 'mock_user_123';
  const reviews = userId ? await getDueReviews(userId) : [];

  return (
    <div className="p-6 max-w-[720px] w-full mx-auto space-y-6">
      <div>
        <h1 className="font-[Geist] text-headline-md font-semibold text-text-primary">Review Queue</h1>
        <p className="text-body-md text-text-secondary mt-1">
          {reviews.length > 0
            ? `${reviews.length} topic${reviews.length !== 1 ? 's' : ''} due for review today`
            : "No reviews due — you're all caught up."}
        </p>
      </div>

      {reviews.length === 0 && (
        <div className="bg-surface-elevated border border-surface-stroke rounded p-10 text-center">
          <span className="material-symbols-outlined text-[32px] text-text-secondary mb-4 block">check_circle</span>
          <p className="font-[Geist] text-[16px] font-semibold text-text-primary mb-1">All caught up</p>
          <p className="text-[14px] text-text-secondary mb-5">No topics due for review right now.</p>
          <Link
            href="/learn"
            className="inline-flex items-center justify-center bg-primary text-white text-[14px] font-medium px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Learn something new
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.subtopicId}
            className="bg-surface-elevated border border-surface-stroke rounded p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-text-primary font-[Geist] truncate">{review.subtopicName}</p>
              <p className="text-[12px] text-text-secondary mt-0.5 font-[JetBrains_Mono]">
                Mastery: {Math.round(review.masteryScore)}% · Interval: {Math.round(review.intervalDays)} day{review.intervalDays !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href={`/learn/${review.subtopicId}/quiz`}
              className="shrink-0 bg-primary text-white text-[13px] font-medium px-3 py-2 rounded hover:bg-primary/90 transition-colors"
            >
              Review
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
