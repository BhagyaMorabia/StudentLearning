import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { questionAttempts, questions, studentMastery } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { classifyFailureMode } from '@/lib/mastery/algorithm';

const RequestSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedClerkUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('teach', userId); // Reusing teach limits
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });

  let questionId: string;
  try {
    const body = await req.json();
    ({ questionId } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  // Fetch internal user ID
  const { getUserId } = await import('@/lib/db/queries/mastery');
  const internalUserId = await getUserId(userId);
  if (!internalUserId) return Response.json({ error: 'User not found' }, { status: 404 });

  // 1. Fetch the latest attempt for this question
  const [attempt] = await db
    .select()
    .from(questionAttempts)
    .where(
      and(
        eq(questionAttempts.userId, internalUserId),
        eq(questionAttempts.questionId, questionId)
      )
    )
    .orderBy(desc(questionAttempts.createdAt))
    .limit(1);

  if (!attempt) {
    return Response.json({ error: 'No attempt found for this question' }, { status: 404 });
  }

  // 2. Fetch the actual question details
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!question) {
    return Response.json({ error: 'Question not found' }, { status: 404 });
  }

  // 3. Fetch Mastery for FSRS retrievability
  const [mastery] = await db
    .select()
    .from(studentMastery)
    .where(
      and(
        eq(studentMastery.userId, internalUserId),
        eq(studentMastery.subtopicId, question.subtopicId)
      )
    )
    .limit(1);

  // Compute Retrievability
  let isRetrievabilityLow = false;
  let retentionPercentage = 100;
  if (mastery?.nextReviewAt) {
    const isDue = mastery.nextReviewAt.getTime() < Date.now();
    isRetrievabilityLow = isDue;
    retentionPercentage = isDue ? 70 : 90; // Fallback estimates for FSRS logic
  }

  // Extract precise error type from the selected option
  let misconceptionType: string | null = null;
  let prerequisiteTrapId: string | null = null;

  if (Array.isArray(question.options)) {
    // attempt.selectedAnswer might be an array for MSQ, but for telemetry finding the first matching trap is sufficient
    const selectedAnswerStr = Array.isArray(attempt.selectedAnswer) 
      ? String(attempt.selectedAnswer[0]) 
      : String(attempt.selectedAnswer);

    const selectedOption = (question.options as Array<{id?: string, misconceptionType?: string, prerequisiteTrapId?: string}>).find(
      (opt) => String(opt.id) === selectedAnswerStr
    );

    if (selectedOption) {
      misconceptionType = selectedOption.misconceptionType ?? null;
      prerequisiteTrapId = selectedOption.prerequisiteTrapId ?? null;
    }
  }

  // 4. Classify Failure Mode
  const failureMode = classifyFailureMode(
    attempt.isCorrect ?? false,
    (attempt.timeSpentMs ?? 0) / 1000,
    question.expectedTimeSeconds ?? 120,
    attempt.optionSwitchCount ?? 0,
    misconceptionType,
    prerequisiteTrapId,
    isRetrievabilityLow
  );

  // 5. Determine Next Interactive State
  let nextState = 'CONCEPTUAL_REVIEW';
  let targetDifficulty = question.difficultyLevel ?? 3;

  if (failureMode === 'MODE_1_PREREQUISITE') {
    nextState = 'PREREQUISITE_DRILL';
    targetDifficulty = 1; // Pull easiest questions from prereq
  } else if (failureMode === 'MODE_3_PROCEDURAL' || failureMode === 'MODE_4_FORMULA') {
    nextState = 'PROCEDURAL_WALKTHROUGH';
    targetDifficulty = Math.max(1, targetDifficulty - 1); // Drop difficulty by 1
  } else if (failureMode === 'MODE_7_FORGETTING') {
    nextState = 'MEMORY_REFRESHER';
  } else if (failureMode === 'MODE_5_CARELESS' || failureMode === 'MODE_6_GUESSING') {
    nextState = 'CARELESS_RETRY';
  }

  return Response.json({
    success: true,
    diagnosticState: nextState,
    failureMode,
    retentionPercentage,
    targetDifficulty,
    subtopicId: question.subtopicId,
  });
}
