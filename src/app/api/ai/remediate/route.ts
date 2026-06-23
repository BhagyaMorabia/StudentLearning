/**
 * POST /api/ai/remediate
 *
 * Explains why a student's wrong answer was incorrect.
 * The server fetches the correct answer and solution steps from DB,
 * then asks Claude to diagnose the student's specific mistake.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from '@/lib/ai/client';
import { REMEDIATE_SYSTEM_PROMPT } from '@/lib/ai/prompts/remediate';
import { getQuestion } from '@/lib/db/queries/questions';
import { RemediationResponseSchema } from '@/lib/ai/schemas';

const RequestSchema = z.object({
  questionId: z.string().uuid(),
  selectedAnswer: z.unknown(), // What the student chose
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let questionId: string, selectedAnswer: unknown;
  try {
    const body = await req.json();
    ({ questionId, selectedAnswer } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  // Fetch question with correct answer (server-side only)
  const question = await getQuestion(questionId);
  if (!question) {
    return Response.json({ error: 'Question not found' }, { status: 404 });
  }

  const userMessage = `
QUESTION: ${question.questionText}
QUESTION TYPE: ${question.questionType}
STUDENT'S ANSWER: ${JSON.stringify(selectedAnswer)}
CORRECT ANSWER: ${JSON.stringify(question.correctAnswer)}
SOLUTION STEPS: ${JSON.stringify(question.solutionSteps ?? [])}
CONCEPTS TESTED: ${(question.conceptsTested ?? []).join(', ')}

Please diagnose the student's mistake and explain the correct approach.
  `.trim();

  // Streaming remediation response
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: REMEDIATE_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          });

          let fullText = '';
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
              fullText += chunk.delta.text;
            }
          }

          // Validate JSON structure (warn but don't fail the stream)
          try {
            RemediationResponseSchema.parse(JSON.parse(fullText));
          } catch {
            console.warn('[remediate] Response did not match schema');
          }
        } catch (err) {
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
