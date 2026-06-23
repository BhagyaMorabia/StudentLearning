import { getDueReviews } from '@/lib/db/queries/review';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review',
  description: 'Your spaced repetition review queue — topics due for review today.',
};

export default async function ReviewPage() {
  const { userId } = await auth();
  const reviews = userId ? await getDueReviews(userId) : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground mt-1">
          {reviews.length > 0
            ? `${reviews.length} topic${reviews.length !== 1 ? 's' : ''} due for review today`
            : 'No reviews due — you\'re all caught up!'}
        </p>
      </div>

      {reviews.length === 0 && (
        <div className="text-center py-20 border rounded-xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
          <p className="text-muted-foreground mb-4">No topics due for review right now.</p>
          <Link href="/learn" className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Learn something new
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.subtopicId} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
            <div>
              <p className="font-medium">{review.subtopicName}</p>
              <p className="text-sm text-muted-foreground">
                Mastery: {Math.round(review.masteryScore)}% · Interval: {Math.round(review.intervalDays)} day{review.intervalDays !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href={`/learn/${review.subtopicId}/quiz`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Review →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
