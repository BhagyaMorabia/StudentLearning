/**
 * POST /api/quiz/submit
 *
 * CRITICAL SECURITY ROUTE — Server-side answer validation.
 *
 * The client sends: {subtopicId, answers: [{questionId, selectedAnswer, timeSpentMs}]}
 * The server:
 *   1. Fetches correct answers from DB (never from client)
 *   2. Validates each answer server-side
 *   3. Computes mastery score
 *   4. Saves all attempts to question_attempts table
 *   5. Upserts student_mastery table
 *   6. Updates SM-2 spaced rep schedule
 *
 * A student CANNOT POST a fake score. The server always recomputes from raw answers.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { questions, questionAttempts, learningEvents } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { computeMastery } from '@/lib/mastery/algorithm';
import { computeNextReview } from '@/lib/mastery/spaced-rep';
import { upsertMastery, getMasteryForSubtopic, updateSpacedRep } from '@/lib/db/queries/mastery';
import { checkRateLimit } from '@/lib/rate-limit';
import type { QuestionAttemptInput } from '@/lib/mastery/algorithm';

const SubmitSchema = z.object({
  subtopicId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedAnswer: z.unknown(), // Validated per question type server-side
      timeSpentMs: z.number().int().positive().max(600_000), // Max 10 min per question
    }),
  ).min(1).max(10),
});

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Rate limiting ─────────────────────────────────────────────────────
  const { success } = await checkRateLimit('submit', userId);
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // ── 3. Validate request body ─────────────────────────────────────────────
  let subtopicId: string;
  let answers: z.infer<typeof SubmitSchema>['answers'];
  try {
    const body = await req.json();
    ({ subtopicId, answers } = SubmitSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request body', detail: String(err) }, { status: 400 });
  }

  // ── 4. Fetch correct answers from DB ─────────────────────────────────────
  // NEVER trust correctAnswer from the client. Always fetch from DB.
  const questionIds = answers.map((a) => a.questionId);
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, questionIds));

  if (dbQuestions.length !== questionIds.length) {
    return Response.json(
      { error: 'One or more question IDs are invalid' },
      { status: 400 },
    );
  }

  const questionMap = new Map(dbQuestions.map((q) => [q.id, q]));

  // ── 5. Server-side answer validation ────────────────────────────────────
  const attempts: QuestionAttemptInput[] = [];
  const attemptRows: (typeof questionAttempts.$inferInsert)[] = [];

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    const isCorrect = validateAnswer(question.questionType, question.correctAnswer, answer.selectedAnswer);

    attempts.push({
      questionId: answer.questionId,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
      conceptsTested: (question.conceptsTested ?? []) as string[],
      expectedTimeSeconds: question.expectedTimeSeconds ?? 120,
    });

    attemptRows.push({
      userId, // This is clerkId — mastery queries handle translation
      questionId: answer.questionId,
      subtopicId,
      selectedAnswer: answer.selectedAnswer as Record<string, unknown>,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
    });
  }

  // ── 6. Compute mastery score ─────────────────────────────────────────────
  const masteryResult = computeMastery(attempts);

  // ── 7. Save attempts to DB ───────────────────────────────────────────────
  if (attemptRows.length > 0) {
    // Get the internal userId first
    const { getUserId } = await import('@/lib/db/queries/mastery');
    const internalUserId = await getUserId(userId);

    if (internalUserId) {
      await db.insert(questionAttempts).values(
        attemptRows.map((r) => ({ ...r, userId: internalUserId })),
      );

      // Log analytics event
      await db.insert(learningEvents).values({
        userId: internalUserId,
        subtopicId,
        eventType: 'QUIZ_COMPLETED',
        payload: {
          score: masteryResult.masteryScore,
          status: masteryResult.status,
          totalAttempted: masteryResult.totalAttempted,
          totalCorrect: masteryResult.totalCorrect,
        },
      });
    }
  }

  // ── 8. Upsert mastery ────────────────────────────────────────────────────
  await upsertMastery(userId, subtopicId, masteryResult);

  // ── 9. Update SM-2 spaced rep schedule ───────────────────────────────────
  const currentMastery = await getMasteryForSubtopic(userId, subtopicId);
  const currentSpacedRep = {
    intervalDays: currentMastery?.intervalDays ?? 1,
    easeFactor: currentMastery?.easeFactor ?? 2.5,
    repetitionCount: currentMastery?.repetitionCount ?? 0,
    nextReviewAt: currentMastery?.nextReviewAt ?? new Date(),
  };
  const newSpacedRep = computeNextReview(currentSpacedRep, masteryResult.masteryScore);
  await updateSpacedRep(userId, subtopicId, newSpacedRep);

  // ── 10. Return result (no correct answers exposed) ───────────────────────
  return Response.json({
    success: true,
    data: {
      masteryScore: masteryResult.masteryScore,
      status: masteryResult.status,
      accuracy: masteryResult.accuracy,
      totalAttempted: masteryResult.totalAttempted,
      totalCorrect: masteryResult.totalCorrect,
      weakConceptTags: masteryResult.weakConceptTags,
      nextReviewAt: newSpacedRep.nextReviewAt,
      // Per-question feedback (isCorrect only — not the correct answer)
      questionResults: attempts.map((a) => ({
        questionId: a.questionId,
        isCorrect: a.isCorrect,
        timeSpentMs: a.timeSpentMs,
      })),
    },
  });
}

/**
 * Server-side answer validation.
 * Each question type has its own validation logic.
 * correctAnswer is the raw JSONB value from the DB.
 */
function validateAnswer(
  questionType: string,
  correctAnswer: unknown,
  selectedAnswer: unknown,
): boolean {
  const correct = correctAnswer as {
    value?: string | null;
    values?: string[] | null;
    tolerance?: number | null;
  };

  switch (questionType) {
    case 'MCQ':
      // Single option selected — must match exactly
      return String(selectedAnswer) === String(correct.value ?? '');

    case 'MSQ': {
      // Multiple options — sets must match exactly (order independent)
      const selected = new Set(
        Array.isArray(selectedAnswer) ? (selectedAnswer as string[]).map(String) : [],
      );
      const expected = new Set((correct.values ?? []).map(String));
      return (
        selected.size === expected.size &&
        [...selected].every((v) => expected.has(v))
      );
    }

    case 'INTEGER':
      // Integer answer — must match exactly
      return (
        !isNaN(Number(selectedAnswer)) &&
        Number(selectedAnswer) === Number(correct.value)
      );

    case 'NUMERICAL': {
      // Numerical answer — within tolerance
      const tolerance = correct.tolerance ?? 0.01;
      return (
        !isNaN(Number(selectedAnswer)) &&
        Math.abs(Number(selectedAnswer) - Number(correct.value)) <= tolerance
      );
    }

    default:
      return false;
  }
}
