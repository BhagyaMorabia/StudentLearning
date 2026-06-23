import { db } from '@/lib/db/client';
import { studentMastery, subtopics } from '@/lib/db/schema';
import { eq, and, lte, isNotNull, asc } from 'drizzle-orm';
import { getUserId } from './mastery';

export interface DueReview {
  subtopicId: string;
  subtopicName: string;
  masteryScore: number;
  nextReviewAt: Date;
  intervalDays: number;
}

// ── Get subtopics due for spaced repetition review ─────────────────────────

export async function getDueReviews(
  clerkId: string,
  limit = 20,
): Promise<DueReview[]> {
  const userId = await getUserId(clerkId);
  if (!userId) return [];

  const now = new Date();

  const rows = await db
    .select({
      subtopicId: studentMastery.subtopicId,
      subtopicName: subtopics.name,
      masteryScore: studentMastery.masteryScore,
      nextReviewAt: studentMastery.nextReviewAt,
      intervalDays: studentMastery.intervalDays,
    })
    .from(studentMastery)
    .innerJoin(subtopics, eq(studentMastery.subtopicId, subtopics.id))
    .where(
      and(
        eq(studentMastery.userId, userId),
        isNotNull(studentMastery.nextReviewAt),
        lte(studentMastery.nextReviewAt, now),
      ),
    )
    .orderBy(asc(studentMastery.nextReviewAt))
    .limit(limit);

  return rows.map((r) => ({
    subtopicId: r.subtopicId,
    subtopicName: r.subtopicName,
    masteryScore: r.masteryScore ?? 0,
    nextReviewAt: r.nextReviewAt!,
    intervalDays: r.intervalDays ?? 1,
  }));
}
