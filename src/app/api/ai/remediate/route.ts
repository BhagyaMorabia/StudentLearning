/**
 * POST /api/ai/remediate
 *
 * Explains why a student's wrong answer was incorrect.
 * The server securely fetches the student's latest attempt telemetry from the DB,
 * evaluates their cognitive failure mode, and generates a dynamic Socratic prompt.
 */

import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { questionAttempts, studentMastery } from '@/lib/db/schema';
import { GEMINI_MODEL, getGeminiClient } from '@/lib/ai/client';
import { buildRemediationSystemPrompt } from '@/lib/ai/prompts/remediate';
import { getQuestion } from '@/lib/db/queries/questions';
import { getUserId } from '@/lib/db/queries/mastery';
import { checkRateLimit } from '@/lib/rate-limit';
import { finishLlmTrace, startLlmTrace } from '@/lib/ai/observability';
import { getSemanticCache, setSemanticCache } from '@/lib/ai/semantic-cache';

const PROMPT_VERSION = 'remediate-socratic-v2-faang-secure';

const RequestSchema = z.object({
  questionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const clerkUserId = await getAuthenticatedClerkUserId();
  if (!clerkUserId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('remediate', clerkUserId);
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });

  let questionId: string;
  try {
    const body = await req.json();
    ({ questionId } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  const internalUserId = await getUserId(clerkUserId);
  if (!internalUserId) {
    return Response.json({ error: 'User not synced' }, { status: 404 });
  }

  // 1. Fetch question with correct answer (server-side only)
  const question = await getQuestion(questionId);
  if (!question) {
    return Response.json({ error: 'Question not found' }, { status: 404 });
  }

  // 2. Securely fetch the latest attempt telemetry for this user + question
  const [latestAttempt] = await db
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

  if (!latestAttempt) {
    return Response.json({ error: 'No attempt found to remediate' }, { status: 400 });
  }

  // 3. Fetch the student's mastery state for this subtopic to inform the AI
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

  const failureMode = latestAttempt.detectedFailureMode ?? 'UNKNOWN';
  const masteryStatus = mastery?.status ?? 'NEW';

  const userMessage = `
QUESTION: ${question.questionText}
QUESTION TYPE: ${question.questionType}
STUDENT'S ANSWER: ${JSON.stringify(latestAttempt.selectedAnswer)}
TIME SPENT ON ATTEMPT: ${(latestAttempt.timeSpentMs ?? 0) / 1000} seconds

<solution_guidance>
${JSON.stringify(question.solutionSteps ?? [])}
</solution_guidance>

CONCEPTS TESTED: ${(question.conceptsTested ?? []).join(', ')}

Please diagnose the student's mistake based on the provided solution guidance and the system prompt instructions.
  `.trim();

  // Cache key salt ensures students with different classified failure modes
  // (MODE_6_GUESSING vs MODE_1_PREREQUISITE) never hit each other's cached
  // remediation even if they typed the same question text verbatim.
  const cacheSaltedPrompt =
    `[mode=${failureMode}|mastery=${masteryStatus}]\n` + userMessage;

  const systemInstruction = buildRemediationSystemPrompt(failureMode, masteryStatus);

  const trace = startLlmTrace({
    route: 'api.ai.remediate',
    model: GEMINI_MODEL,
    promptVersion: PROMPT_VERSION,
    metadata: { userId: clerkUserId, questionId, failureMode, masteryStatus },
  });

  const cachedResponse = await getSemanticCache({
    route: 'api.ai.remediate',
    model: GEMINI_MODEL,
    promptVersion: PROMPT_VERSION,
    prompt: cacheSaltedPrompt,
  });

  // Streaming remediation response
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          if (cachedResponse) {
            controller.enqueue(new TextEncoder().encode(cachedResponse));
            await finishLlmTrace(trace, {
              status: 'cache_hit',
              prompt: userMessage,
              output: cachedResponse,
            });
            return;
          }

          let fullText = '';
          const stream = await getGeminiClient().models.generateContentStream({
            model: GEMINI_MODEL,
            contents: userMessage,
            config: {
              systemInstruction,
            },
          });

          for await (const chunk of stream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
              fullText += chunk.text;
            }
          }
          await finishLlmTrace(trace, {
            status: 'success',
            prompt: userMessage,
            output: fullText,
          });
          if (fullText.trim()) {
            await setSemanticCache({
              route: 'api.ai.remediate',
              model: GEMINI_MODEL,
              promptVersion: PROMPT_VERSION,
              prompt: cacheSaltedPrompt,
              response: fullText,
            });
          }
        } catch (err) {
          await finishLlmTrace(trace, {
            status: 'error',
            prompt: userMessage,
            error: err,
          });
          controller.enqueue(
            new TextEncoder().encode(JSON.stringify({ error: String(err) })),
          );
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
