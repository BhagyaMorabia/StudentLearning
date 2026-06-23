/**
 * GET  /api/progress — Student mastery overview for dashboard
 * POST /api/progress — Log a learning event
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getMasteryOverview } from '@/lib/db/queries/mastery';
import { getDueReviews } from '@/lib/db/queries/review';
import { db } from '@/lib/db/client';
import { learningEvents } from '@/lib/db/schema';
import { getUserId } from '@/lib/db/queries/mastery';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [mastery, dueReviews] = await Promise.all([
    getMasteryOverview(userId),
    getDueReviews(userId),
  ]);

  return Response.json({
    success: true,
    data: {
      mastery,
      dueReviews,
      stats: {
        totalSubtopics: mastery.length,
        mastered: mastery.filter((m) => m.status === 'MASTERED').length,
        needsReview: mastery.filter((m) => m.status === 'NEEDS_REVIEW').length,
        weak: mastery.filter((m) => m.status === 'WEAK').length,
        dueForReview: dueReviews.length,
      },
    },
  });
}

const EventSchema = z.object({
  eventType: z.enum([
    'TEACH_STARTED',
    'TEACH_COMPLETED',
    'QUIZ_STARTED',
    'REVIEW_COMPLETED',
  ]),
  subtopicId: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let event: z.infer<typeof EventSchema>;
  try {
    const body = await req.json();
    event = EventSchema.parse(body);
  } catch (err) {
    return Response.json({ error: 'Invalid event', detail: String(err) }, { status: 400 });
  }

  const internalUserId = await getUserId(userId);
  if (!internalUserId) return Response.json({ error: 'User not synced' }, { status: 404 });

  await db.insert(learningEvents).values({
    userId: internalUserId,
    subtopicId: event.subtopicId,
    eventType: event.eventType,
    payload: event.payload ?? null,
  });

  return Response.json({ success: true });
}
