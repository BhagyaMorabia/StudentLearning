/**
 * POST /api/quiz/submit
 *
 * Server-side quiz validation and persistence.
 * The client never submits scores or correct answers; the server fetches
 * verified questions for the submitted subtopic and computes the result.
 */

import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/client';
import { getUserId } from '@/lib/db/queries/mastery';
import { learningEvents, questionAttempts, questions, quizSubmissions, studentMastery } from '@/lib/db/schema';
import { classifyFailureMode, computeMastery, isRetrievabilityLow } from '@/lib/mastery/algorithm';
import type { FsrsStateLike, MasteryResult, QuestionAttemptInput } from '@/lib/mastery/algorithm';
import { computeNextReview } from '@/lib/mastery/spaced-rep';
import { checkRateLimit } from '@/lib/rate-limit';
import { findSelectedOptionMetadata, validateAnswer } from '@/lib/quiz/answer-validator';
import { logger } from '@/lib/logger';

const SubmitSchema = z.object({
  idempotencyKey: z.string().uuid(),
  subtopicId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedAnswer: z.unknown(),
        timeSpentMs: z.number().int().positive().max(600_000),
        optionSwitchCount: z.number().int().min(0).max(100).default(0),
      }),
    )
    .min(1)
    .max(15),
}).refine(data => data.subtopicId || data.chapterId, "Must provide either subtopicId or chapterId");

interface QuizResponseData {
  masteryScore: number;
  status: MasteryResult['status'];
  accuracy: number;
  totalAttempted: number;
  totalCorrect: number;
  weakConceptTags: string[];
  nextReviewAt: string;
  processingStatus: 'PENDING_MASTERY' | 'PROCESSED';
  questionResults: Array<{
    questionId: string;
    isCorrect: boolean;
    timeSpentMs: number;
    failureMode: string;
    questionText: string;
    questionType: string;
    options: unknown;
    correctAnswer: unknown;
    selectedAnswer: unknown;
    solutionSteps: unknown;
  }>;
}

export interface SubtopicAggregationInput {
  subtopicId: string;
  masteryResult: MasteryResult;
  failureModes: string[];
}

export async function POST(req: NextRequest) {
  const clerkUserId = await getAuthenticatedClerkUserId();
  if (!clerkUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await checkRateLimit('submit', clerkUserId);
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let submission: z.infer<typeof SubmitSchema>;
  try {
    submission = SubmitSchema.parse(await req.json());
  } catch (err) {
    return Response.json({ error: 'Invalid request body', detail: String(err) }, { status: 400 });
  }

  const internalUserId = await getUserId(clerkUserId);
  if (!internalUserId) {
    return Response.json({ error: 'User not synced' }, { status: 404 });
  }

  const [existingSubmission] = await db
    .select()
    .from(quizSubmissions)
    .where(
      and(
        eq(quizSubmissions.userId, internalUserId),
        eq(quizSubmissions.idempotencyKey, submission.idempotencyKey),
      ),
    )
    .limit(1);

  if (existingSubmission) {
    return Response.json({
      success: true,
      duplicate: true,
      data: existingSubmission.result,
    });
  }

  const questionIds = submission.answers.map((answer) => answer.questionId);
  if (new Set(questionIds).size !== questionIds.length) {
    return Response.json({ error: 'Duplicate question IDs are not allowed' }, { status: 400 });
  }

  // SECURITY: every question must be VERIFIED AND belong to the submitted
  // subtopicId. A client otherwise could submit answers to known-easy
  // questions from unrelated subtopics and poison mastery for the target one.
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        inArray(questions.id, questionIds),
        eq(questions.status, 'VERIFIED')
      ),
    );

  if (dbQuestions.length !== questionIds.length) {
    logger.warn('Quiz submit rejected: missing questions', {
      internalUserId,
      expectedCount: questionIds.length,
      matchedCount: dbQuestions.length,
    });
    return Response.json(
      { error: 'One or more question IDs are invalid' },
      { status: 400 },
    );
  }

  const questionMap = new Map(dbQuestions.map((question) => [question.id, question]));
  const attempts: QuestionAttemptInput[] = [];
  const attemptRows: (typeof questionAttempts.$inferInsert)[] = [];
  const attemptsBySubtopic = new Map<string, QuestionAttemptInput[]>();
  const attemptRowsBySubtopic = new Map<string, (typeof questionAttempts.$inferInsert)[]>();

  // For retrievability, we'll only check if there's a low retrievability on ANY subtopic they answered.
  // We'll fetch all relevant mastery rows for the subtopics they answered.
  const subtopicIdsToUpdate = Array.from(new Set(dbQuestions.map(q => q.subtopicId)));
  const existingMasteries = await db
    .select()
    .from(studentMastery)
    .where(
      and(
        eq(studentMastery.userId, internalUserId),
        inArray(studentMastery.subtopicId, subtopicIdsToUpdate),
      ),
    );
  const masteryMap = new Map(existingMasteries.map(m => [m.subtopicId, m]));

  for (const answer of submission.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    const existingMastery = masteryMap.get(question.subtopicId);
    const fsrsStateLike: FsrsStateLike = {
      due: existingMastery?.nextReviewAt ?? null,
      last_review: existingMastery?.lastAttemptAt ?? null,
      lapses: typeof existingMastery?.fsrsState === 'object' && existingMastery.fsrsState && 'lapses' in existingMastery.fsrsState
        ? (existingMastery.fsrsState as { lapses?: number }).lapses ?? 0
        : 0,
      retrievability: typeof existingMastery?.fsrsState === 'object' && existingMastery.fsrsState && 'retrievability' in existingMastery.fsrsState
        ? (existingMastery.fsrsState as { retrievability?: number }).retrievability ?? null
        : null,
    };
    const lowRetrievability = isRetrievabilityLow(fsrsStateLike);

    const isCorrect = validateAnswer(question.questionType, question.correctAnswer, answer.selectedAnswer);
    const selectedOption = findSelectedOptionMetadata(question.options, answer.selectedAnswer);
    const expectedTimeSeconds = question.expectedTimeSeconds ?? 120;
    const detectedFailureMode = classifyFailureMode(
      isCorrect,
      answer.timeSpentMs / 1000,
      expectedTimeSeconds,
      answer.optionSwitchCount,
      selectedOption?.misconceptionType ?? null,
      selectedOption?.prerequisiteTrapId ?? null,
      lowRetrievability,
    );

    const attempt = {
      questionId: answer.questionId,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
      conceptsTested: question.conceptsTested ?? [],
      expectedTimeSeconds,
    };
    attempts.push(attempt);
    if (!attemptsBySubtopic.has(question.subtopicId)) {
      attemptsBySubtopic.set(question.subtopicId, []);
    }
    attemptsBySubtopic.get(question.subtopicId)!.push(attempt);

    const attemptRow = {
      userId: internalUserId,
      questionId: answer.questionId,
      subtopicId: question.subtopicId,
      selectedAnswer: answer.selectedAnswer,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
      optionSwitchCount: answer.optionSwitchCount,
      detectedFailureMode,
      activatedMisconceptionId: selectedOption?.prerequisiteTrapId ?? null,
      remediationTriggered: detectedFailureMode !== 'NONE',
    };
    attemptRows.push(attemptRow);
    if (!attemptRowsBySubtopic.has(question.subtopicId)) {
      attemptRowsBySubtopic.set(question.subtopicId, []);
    }
    attemptRowsBySubtopic.get(question.subtopicId)!.push(attemptRow);
  }

  // Calculate overall response data
  const masteryResult = computeMastery(attempts);
  const aggregations: SubtopicAggregationInput[] = [];

  for (const [subtopicId, subAttempts] of attemptsBySubtopic.entries()) {
    const subResult = computeMastery(subAttempts);
    const subRows = attemptRowsBySubtopic.get(subtopicId) || [];
    aggregations.push({
      subtopicId,
      masteryResult: subResult,
      failureModes: subRows.map(r => r.detectedFailureMode ?? 'NONE'),
    });
  }

  // For the API response (if subtopic, show nextReviewAt, if chapter, show nothing or first)
  const targetSubtopicId = submission.subtopicId ?? dbQuestions[0].subtopicId;
  const targetMastery = masteryMap.get(targetSubtopicId);
  const responseCard = computeNextReview(targetMastery?.fsrsState, masteryResult.masteryScore);

  const responseData: QuizResponseData = {
    masteryScore: masteryResult.masteryScore,
    status: masteryResult.status,
    accuracy: masteryResult.accuracy,
    totalAttempted: masteryResult.totalAttempted,
    totalCorrect: masteryResult.totalCorrect,
    weakConceptTags: masteryResult.weakConceptTags,
    nextReviewAt: responseCard.due.toISOString(),
    processingStatus: 'PENDING_MASTERY',
    questionResults: attempts.map((attempt) => {
      const q = questionMap.get(attempt.questionId)!;
      const attemptRow = attemptRows.find((row) => row.questionId === attempt.questionId)!;
      
      return {
        questionId: attempt.questionId,
        isCorrect: attempt.isCorrect,
        timeSpentMs: attempt.timeSpentMs,
        failureMode: attemptRow.detectedFailureMode ?? 'NONE',
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        selectedAnswer: attemptRow.selectedAnswer,
        solutionSteps: q.solutionSteps,
      };
    }),
  };

  let submissionId: string | null = null;

  try {
    const persisted = await db.transaction(async (tx) => {
      const [duplicateSubmission] = await tx
        .select()
        .from(quizSubmissions)
        .where(
          and(
            eq(quizSubmissions.userId, internalUserId),
            eq(quizSubmissions.idempotencyKey, submission.idempotencyKey),
          ),
        )
        .limit(1);

      if (duplicateSubmission) {
        return { id: duplicateSubmission.id, result: duplicateSubmission.result as QuizResponseData, duplicate: true };
      }

      const [createdSubmission] = await tx
        .insert(quizSubmissions)
        .values({
          userId: internalUserId,
          subtopicId: submission.subtopicId ?? null,
          chapterId: submission.chapterId ?? null,
          idempotencyKey: submission.idempotencyKey,
          status: 'PENDING_MASTERY',
          result: responseData,
        })
        .returning({ id: quizSubmissions.id });

      if (attemptRows.length > 0) {
        await tx.insert(questionAttempts).values(attemptRows);
      }

      return { id: createdSubmission.id, result: responseData, duplicate: false };
    });

    if (persisted.duplicate) {
      return Response.json({ success: true, duplicate: true, data: persisted.result });
    }

    submissionId = persisted.id;
  } catch (txError) {
    if (isUniqueViolation(txError)) {
      const [duplicateSubmission] = await db
        .select()
        .from(quizSubmissions)
        .where(
          and(
            eq(quizSubmissions.userId, internalUserId),
            eq(quizSubmissions.idempotencyKey, submission.idempotencyKey),
          ),
        )
        .limit(1);

      if (duplicateSubmission) {
        return Response.json({
          success: true,
          duplicate: true,
          data: duplicateSubmission.result,
        });
      }
    }

    logger.error('Quiz submit transaction failed', txError, { internalUserId, subtopicId: submission.subtopicId, chapterId: submission.chapterId });
    return Response.json({ error: 'Failed to save quiz results' }, { status: 500 });
  }

  after(async () => {
    if (!submissionId) return;
    await processMasteryAggregation({
      submissionId,
      userId: internalUserId,
      aggregations,
      responseData,
    });
  });

  return Response.json({
    success: true,
    data: responseData,
  });
}

type QuizProcessingStatus = 'PENDING_MASTERY' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

/**
 * Idempotently aggregates a quiz submission into the student mastery row.
 *
 * Concurrency design (FAANG standard single-writer pattern):
 *   1. Atomic UPDATE ... WHERE status IN (PENDING, FAILED) RETURNING * claims
 *      the row for THIS worker. If 0 rows affected, another concurrent
 *      `after()` or cron recovery owns it — short-circuit.
 *   2. SELECT ... FOR UPDATE on the studentMastery composite (userId, subtopicId)
 *      serializes two different subtopic submissions racing for the same user.
 *   3. ONE combined UPDATE to studentMastery writes counters + fsrs together.
 *      This eliminates the old split-brain pattern where the fsrs write could
 *      silently overwrite a freshly-written counter increment.
 *   4. Terminal transition PROCESSING → PROCESSED; or catch → FAILED with
 *      attempts + error for the cron retry loop.
 */
async function processMasteryAggregation(input: {
  submissionId: string;
  userId: string;
  aggregations: SubtopicAggregationInput[];
  responseData: QuizResponseData;
}) {
  try {
    // ── Step 1: Claim ownership of the submission ────────────────────────
    const claimed = await db
      .update(quizSubmissions)
      .set({ status: 'PROCESSING' as QuizProcessingStatus })
      .where(
        and(
          eq(quizSubmissions.id, input.submissionId),
          inArray(quizSubmissions.status, ['PENDING_MASTERY', 'FAILED'] as QuizProcessingStatus[]),
        ),
      )
      .returning({ id: quizSubmissions.id, attempts: quizSubmissions.processingAttempts });

    if (claimed.length === 0) {
      // Another concurrent worker (after() or cron) already owns this.
      return null;
    }

    const processedResult = await db.transaction(async (tx) => {
      const now = new Date();

      for (const agg of input.aggregations) {
        // ── Step 2: Lock mastery row for composite (userId, subtopicId) ────
        const [existingMastery] = await tx
          .select()
          .from(studentMastery)
          .where(
            and(
              eq(studentMastery.userId, input.userId),
              eq(studentMastery.subtopicId, agg.subtopicId),
            ),
          )
          .limit(1)
          .for('update');

        const newCard = computeNextReview(existingMastery?.fsrsState, agg.masteryResult.masteryScore);

        // ── Step 3: SINGLE atomic upsert of counters + FSRS together ──────
        if (!existingMastery) {
          await tx.insert(studentMastery).values({
            userId: input.userId,
            subtopicId: agg.subtopicId,
            questionsAttempted: agg.masteryResult.totalAttempted,
            questionsCorrect: agg.masteryResult.totalCorrect,
            masteryScore: agg.masteryResult.masteryScore,
            status: agg.masteryResult.status,
            weakConceptTags: agg.masteryResult.weakConceptTags,
            avgTimePerQuestionMs: agg.masteryResult.avgTimeMs,
            firstAttemptAt: now,
            lastAttemptAt: now,
            fsrsState: newCard,
            nextReviewAt: newCard.due,
          });
        } else {
          await tx
            .update(studentMastery)
            .set({
              questionsAttempted: sql`${studentMastery.questionsAttempted} + ${agg.masteryResult.totalAttempted}`,
              questionsCorrect: sql`${studentMastery.questionsCorrect} + ${agg.masteryResult.totalCorrect}`,
              masteryScore: agg.masteryResult.masteryScore,
              status: agg.masteryResult.status,
              weakConceptTags: agg.masteryResult.weakConceptTags,
              avgTimePerQuestionMs: agg.masteryResult.avgTimeMs,
              lastAttemptAt: now,
              fsrsState: newCard,
              nextReviewAt: newCard.due,
            })
            .where(
              and(
                eq(studentMastery.userId, input.userId),
                eq(studentMastery.subtopicId, agg.subtopicId),
              ),
            );
        }

        await tx.insert(learningEvents).values({
          userId: input.userId,
          subtopicId: agg.subtopicId,
          eventType: 'QUIZ_COMPLETED',
          payload: {
            score: agg.masteryResult.masteryScore,
            status: agg.masteryResult.status,
            totalAttempted: agg.masteryResult.totalAttempted,
            totalCorrect: agg.masteryResult.totalCorrect,
            failureModes: agg.failureModes,
          },
        });
      }

      const finalResult: QuizResponseData = {
        ...input.responseData,
        processingStatus: 'PROCESSED',
      };

      await tx
        .update(quizSubmissions)
        .set({
          status: 'PROCESSED' as QuizProcessingStatus,
          result: finalResult,
          error: null,
          processedAt: now,
          processingAttempts: (claimed[0]?.attempts ?? 0) + 1,
        })
        .where(eq(quizSubmissions.id, input.submissionId));

      return finalResult;
    });

    revalidatePath('/dashboard');
    revalidatePath('/review');
    return processedResult;
  } catch (error) {
    logger.error('Quiz submit background processing failed', error, {
      submissionId: input.submissionId,
      userId: input.userId,
    });
    await db
      .update(quizSubmissions)
      .set({
        status: 'FAILED' as QuizProcessingStatus,
        error: error instanceof Error ? error.message : String(error),
        processingAttempts: sql`COALESCE(${quizSubmissions.processingAttempts}, 0) + 1`,
      })
      .where(eq(quizSubmissions.id, input.submissionId));
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505',
  );
}
