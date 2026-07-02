import { getDueReviews } from '@/lib/db/queries/review';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Card, Button, EmptyState } from '@/components/ui';
import { PartyPopper } from 'lucide-react';
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
        <h1 className="text-[20px] font-semibold text-foreground">Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reviews.length > 0
            ? `${reviews.length} topic${reviews.length !== 1 ? 's' : ''} due for review today`
            : 'No reviews due — you\'re all caught up!'}
        </p>
      </div>

      {reviews.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={PartyPopper}
            title="All caught up!"
            description="No topics due for review right now."
            action={
              <Link href="/learn" tabIndex={-1}>
                <Button variant="primary">
                  Learn something new
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.subtopicId} className="flex items-center justify-between p-4 hover:border-accent/50 transition-colors">
            <div>
              <p className="text-sm font-semibold text-foreground">{review.subtopicName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mastery: {Math.round(review.masteryScore)}% · Interval: {Math.round(review.intervalDays)} day{review.intervalDays !== 1 ? 's' : ''}
              </p>
            </div>
            <Link href={`/learn/${review.subtopicId}/quiz`} tabIndex={-1}>
              <Button variant="primary" size="sm">
                Review →
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
