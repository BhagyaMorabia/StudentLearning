import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getGeminiClient } from '@/lib/ai/client';

const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'assistant']),
  content: z.string(),
});

const RequestSchema = z.object({
  questionId: z.string().uuid(),
  messages: z.array(MessageSchema).min(1).max(30),
});

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedClerkUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('teach', userId);
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });

  let questionId: string;
  let messages: { role: 'user' | 'model' | 'system' | 'assistant'; content: string }[];
  try {
    const body = await req.json();
    ({ questionId, messages } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!question) return Response.json({ error: 'Question not found' }, { status: 404 });

  const solutionContext = question.solutionSteps
    ? JSON.stringify(question.solutionSteps, null, 2)
    : "No step-by-step solution provided. Infer the steps from the question.";

  const systemInstruction = `You are a FAANG-level Cognitive AI Tutor leading a "Rubber Duck" diagnostic session.
The student has failed this exact question:
${question.questionText}

Here is the correct step-by-step solution:
${solutionContext}

YOUR DIRECTIVES:
1. Do NOT give away the answer.
2. Force the student to explain their intent. (e.g. "Why did you pick that formula?")
3. Evaluate ONLY their most recent step. If they are correct, congratulate them and ask for the next step. If incorrect, point out the logical flaw.
4. Keep responses extremely concise. No rambling. 1-2 sentences maximum.
5. If they are completely stuck, provide a hint, not the solution.`;

  try {
    const geminiClient = getGeminiClient();
    
    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const stream = await geminiClient.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (err) {
    console.error('[Diagnostic] Step-by-step chat failed:', err);
    return Response.json({ error: 'AI evaluation failed' }, { status: 500 });
  }
}
