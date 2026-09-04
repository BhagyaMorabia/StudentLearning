import { db } from '@/lib/db/client';
import { studentMastery, users, subtopics } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { StudentMastery } from '@/lib/db/schema';

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

export type MasteryOverviewRow = StudentMastery & { subtopicName: string | null };

export async function getMasteryOverview(clerkId: string): Promise<MasteryOverviewRow[]> {
  const userId = await getUserId(clerkId);
  if (!userId) return [];

  const rows = await db
    .select({
      mastery: studentMastery,
      subtopicName: subtopics.name,
    })
    .from(studentMastery)
    .leftJoin(subtopics, eq(studentMastery.subtopicId, subtopics.id))
    .where(eq(studentMastery.userId, userId))
    .orderBy(asc(studentMastery.masteryScore));

  return rows.map((row) => ({
    ...row.mastery,
    subtopicName: row.subtopicName,
  }));
}


