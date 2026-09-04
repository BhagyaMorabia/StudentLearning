import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSimilarDiagnosticQuestions, stripAnswerFromQuestion } from '@/lib/db/queries/questions';
import { getGeminiClient } from '@/lib/ai/client';
import type { Question } from '@/lib/db/schema';

const RequestSchema = z.object({
  questionId: z.string().uuid(),
  targetDifficulty: z.number().int().min(1).max(5),
  limit: z.number().int().min(1).max(3).default(1),
});

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedClerkUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('teach', userId);
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });

  let questionId: string;
  let targetDifficulty: number;
  let limit: number;
  try {
    const body = await req.json();
    ({ questionId, targetDifficulty, limit } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  // 1. Fetch original question and its embedding
  const [original] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!original) return Response.json({ error: 'Question not found' }, { status: 404 });

  let similarQuestions: Question[] = [];

  // 2. Try Vector Search first
  if (original.embedding && original.embedding.length === 768) {
    // Need to cast unknown to number[] since drizzle returns unknown/any for vectors depending on driver
    const queryVector = original.embedding as number[];
    similarQuestions = await getSimilarDiagnosticQuestions(questionId, queryVector, targetDifficulty, limit);
  }

  // 3. Fallback to GenAI generation if DB yields no results
  // In a real FAANG pipeline, we use structured outputs via Gemini function calling or responseSchema
  if (similarQuestions.length === 0) {
    console.log(`[Diagnostic] Vector search failed for Q: ${questionId}. Falling back to GenAI synthesis.`);
    try {
      const geminiClient = getGeminiClient();
        const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Create a similar JEE multiple-choice question to this one, but slightly easier (Difficulty Level ${targetDifficulty}):\n\nQuestion: ${original.questionText}\n\nReturn JSON strictly matching this schema: { "questionText": string, "options": [{ "id": string, "text": string }], "correctAnswer": { "value": string } }` }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          // Mocking the structure we expect. A full implementation would use responseSchema.
        }
      });

      const aiText = response.text;
      if (aiText) {
        const generatedJSON = JSON.parse(aiText);
        // Destructure & drop correctAnswer at creation-time so the in-memory
        // array never holds ground-truth answers. The later .map(stripAnswer)
        // at response-time is a belt-and-suspenders defense against any
        // future refactor that accidentally changes this path.
        const { correctAnswer, ...rest } = generatedJSON;
        void correctAnswer;
        similarQuestions.push({
          id: 'genai-' + Date.now(),
          questionText: rest.questionText || 'Generated Question Fallback',
          questionType: 'MCQ',
          options: rest.options || [],
          correctAnswer: undefined,
          difficultyLevel: targetDifficulty,
          expectedTimeSeconds: 120,
          conceptsTested: original.conceptsTested,
        } as unknown as Question);
      }
    } catch (e) {
      console.error('[Diagnostic] GenAI fallback failed:', e);
    }
  }

  if (similarQuestions.length === 0) {
    return Response.json({ error: 'Could not fetch or generate similar questions' }, { status: 500 });
  }

  return Response.json({
    success: true,
    data: similarQuestions.map(stripAnswerFromQuestion),
  });
}
