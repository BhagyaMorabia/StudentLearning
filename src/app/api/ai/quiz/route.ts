/**
 * POST /api/ai/quiz
 *
 * Generates JEE-style questions for a subtopic (5) or chapter (10).
 *
 * Returns client-safe questions (NO correctAnswer, NO isCorrect on options).
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { getQuestionsForSubtopic, getQuestionsForChapter, stripAnswerFromQuestion } from '@/lib/db/queries/questions';
import { getAuthenticatedClerkUserId } from '@/lib/auth/server';

const RequestSchema = z.object({
  subtopicId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
}).refine(data => data.subtopicId || data.chapterId, {
  message: "Either subtopicId or chapterId must be provided"
});

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedClerkUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('quiz', userId);
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });

  let subtopicId: string | undefined;
  let chapterId: string | undefined;
  
  try {
    const body = await req.json();
    ({ subtopicId, chapterId } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  let existingQuestions;
  if (chapterId) {
    existingQuestions = await getQuestionsForChapter(chapterId, 10);
  } else if (subtopicId) {
    existingQuestions = await getQuestionsForSubtopic(subtopicId, 5);
  } else {
    return Response.json({ error: 'Invalid request state' }, { status: 400 });
  }
  
  return Response.json({
    success: true,
    data: existingQuestions.map(stripAnswerFromQuestion),
    source: 'database',
  });
}
