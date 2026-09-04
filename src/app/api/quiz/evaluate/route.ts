import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/client';
import { getUserId } from '@/lib/db/queries/mastery';
import { questions, studentMastery } from '@/lib/db/schema';
import { classifyFailureMode, isRetrievabilityLow } from '@/lib/mastery/algorithm';
import type { FsrsStateLike } from '@/lib/mastery/algorithm';
import {
  findSelectedOptionMetadata,
  validateAnswer,
} from '@/lib/quiz/answer-validator';

const EvaluateSchema = z.object({
  questionId: z.string().uuid(),
  selectedAnswer: z.unknown(),
  timeSpentMs: z.number().int().nonnegative().max(600_000),
  optionSwitchCount: z.number().int().nonnegative().max(100),
});

type FsrsState = {
  lapses?: number;
};

export async function POST(req: NextRequest) {
  try {
    const clerkUserId = await getAuthenticatedClerkUserId();
    if (!clerkUserId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, selectedAnswer, timeSpentMs, optionSwitchCount } =
      EvaluateSchema.parse(await req.json());

    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!question) {
      return Response.json({ error: 'Question not found' }, { status: 404 });
    }

    const isCorrect = validateAnswer(question.questionType, question.correctAnswer, selectedAnswer);
    const selectedOption = isCorrect
      ? null
      : findSelectedOptionMetadata(question.options, selectedAnswer);

    const internalUserId = await getUserId(clerkUserId);
    const mastery = internalUserId
      ? await getMastery(internalUserId, question.subtopicId)
      : null;

    const fsrsStateLike: FsrsStateLike = {
      due: mastery?.nextReviewAt ?? null,
      last_review: mastery?.lastReviewedAt ?? null,
      lapses: typeof mastery?.fsrsState === 'object' && mastery.fsrsState && 'lapses' in mastery.fsrsState
        ? (mastery.fsrsState as { lapses?: number }).lapses ?? 0
        : 0,
      retrievability: typeof mastery?.fsrsState === 'object' && mastery.fsrsState && 'retrievability' in mastery.fsrsState
        ? (mastery.fsrsState as { retrievability?: number }).retrievability ?? null
        : null,
    };
    const lowRetrievability = isRetrievabilityLow(fsrsStateLike);
    const expectedTimeSeconds = question.expectedTimeSeconds ?? 120;
    const failureMode = classifyFailureMode(
      isCorrect,
      timeSpentMs / 1000,
      expectedTimeSeconds,
      optionSwitchCount,
      selectedOption?.misconceptionType ?? null,
      selectedOption?.prerequisiteTrapId ?? null,
      lowRetrievability,
    );

    return Response.json({
      success: true,
      data: {
        isCorrect,
        mode: failureModeToNumber(failureMode),
        misconceptionType: selectedOption?.misconceptionType ?? null,
        failureModeString: failureMode,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', detail: error.flatten() }, { status: 400 });
    }

    console.error('[Quiz Evaluate Failed]', error);
    return Response.json({ error: 'Failed to evaluate' }, { status: 500 });
  }
}

async function getMastery(internalUserId: string, subtopicId: string) {
  const [mastery] = await db
    .select({
      fsrsState: studentMastery.fsrsState,
      nextReviewAt: studentMastery.nextReviewAt,
      lastReviewedAt: studentMastery.lastAttemptAt,
    })
    .from(studentMastery)
    .where(
      and(
        eq(studentMastery.userId, internalUserId),
        eq(studentMastery.subtopicId, subtopicId),
      ),
    )
    .limit(1);

  return mastery ?? null;
}

function getLapses(fsrsState: unknown): number {
  if (!fsrsState || typeof fsrsState !== 'object') return 0;
  const lapses = (fsrsState as FsrsState).lapses;
  return typeof lapses === 'number' ? lapses : 0;
}

function failureModeToNumber(failureMode: string): number {
  const modeMap: Record<string, number> = {
    NONE: 0,
    MODE_1_PREREQUISITE: 1,
    MODE_2_CONCEPTUAL: 2,
    MODE_3_PROCEDURAL: 3,
    MODE_4_FORMULA: 4,
    MODE_5_CARELESS: 5,
    MODE_6_GUESSING: 6,
    MODE_7_FORGETTING: 7,
  };

  return modeMap[failureMode] ?? 0;
}
