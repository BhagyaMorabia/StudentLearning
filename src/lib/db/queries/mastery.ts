import { db } from '@/lib/db/client';
import { studentMastery, users } from '@/lib/db/schema';
import { eq, and, lte, asc } from 'drizzle-orm';
import type { StudentMastery } from '@/lib/db/schema';
import type { MasteryResult } from '@/lib/mastery/algorithm';

// ── Get internal user ID from Clerk ID ─────────────────────────────────────

export async function getUserId(clerkId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user?.id ?? null;
}

// ── Get student's weak topics (concept tags from failed attempts) ───────────

export async function getStudentWeakTopics(clerkId: string): Promise<string[]> {
  const userId = await getUserId(clerkId);
  if (!userId) return [];

  const rows = await db
    .select({ weakConceptTags: studentMastery.weakConceptTags })
    .from(studentMastery)
    .where(eq(studentMastery.userId, userId));

  // Flatten all weak concept tags from all subtopics
  const allWeak = rows.flatMap((r) => r.weakConceptTags ?? []);

  // Deduplicate
  return [...new Set(allWeak)];
}

// ── Get mastery for a specific subtopic ────────────────────────────────────

export async function getMasteryForSubtopic(
  clerkId: string,
  subtopicId: string,
): Promise<StudentMastery | null> {
  const userId = await getUserId(clerkId);
  if (!userId) return null;

  const [row] = await db
    .select()
    .from(studentMastery)
    .where(
      and(
        eq(studentMastery.userId, userId),
        eq(studentMastery.subtopicId, subtopicId),
      ),
    )
    .limit(1);

  return row ?? null;
}

// ── Get full mastery overview for dashboard ────────────────────────────────

export async function getMasteryOverview(clerkId: string): Promise<StudentMastery[]> {
  const userId = await getUserId(clerkId);
  if (!userId) return [];

  return db
    .select()
    .from(studentMastery)
    .where(eq(studentMastery.userId, userId))
    .orderBy(asc(studentMastery.masteryScore));
}

// ── Upsert mastery after quiz submission ──────────────────────────────────

export async function upsertMastery(
  clerkId: string,
  subtopicId: string,
  result: MasteryResult,
): Promise<void> {
  const userId = await getUserId(clerkId);
  if (!userId) throw new Error(`User not found for clerkId: ${clerkId}`);

  const now = new Date();

  // Check if a row exists
  const existing = await getMasteryForSubtopic(clerkId, subtopicId);

  if (!existing) {
    // Insert new row
    await db.insert(studentMastery).values({
      userId,
      subtopicId,
      questionsAttempted: result.totalAttempted,
      questionsCorrect: result.totalCorrect,
      masteryScore: result.masteryScore,
      status: result.status,
      weakConceptTags: result.weakConceptTags,
      avgTimePerQuestionMs: result.avgTimeMs,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
  } else {
    // Update existing row
    await db
      .update(studentMastery)
      .set({
        questionsAttempted:
          (existing.questionsAttempted ?? 0) + result.totalAttempted,
        questionsCorrect:
          (existing.questionsCorrect ?? 0) + result.totalCorrect,
        masteryScore: result.masteryScore,
        status: result.status,
        weakConceptTags: result.weakConceptTags,
        avgTimePerQuestionMs: result.avgTimeMs,
        lastAttemptAt: now,
      })
      .where(eq(studentMastery.id, existing.id));
  }
}

// ── Update SM-2 spaced rep fields ─────────────────────────────────────────

export async function updateSpacedRep(
  clerkId: string,
  subtopicId: string,
  spacedRep: {
    nextReviewAt: Date;
    intervalDays: number;
    easeFactor: number;
    repetitionCount: number;
  },
): Promise<void> {
  const userId = await getUserId(clerkId);
  if (!userId) return;

  await db
    .update(studentMastery)
    .set(spacedRep)
    .where(
      and(
        eq(studentMastery.userId, userId),
        eq(studentMastery.subtopicId, subtopicId),
      ),
    );
}
