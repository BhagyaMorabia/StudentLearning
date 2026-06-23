import { db } from '@/lib/db/client';
import { questions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Question } from '@/lib/db/schema';

// ── Fetch questions for quiz generation ────────────────────────────────────
// IMPORTANT: Never expose correctAnswer or options[].isCorrect to the client.
// The API route strips these fields before responding.

export async function getQuestionsForSubtopic(
  subtopicId: string,
  limit = 5,
): Promise<Question[]> {
  return db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subtopicId, subtopicId),
        eq(questions.status, 'VERIFIED'),
      ),
    )
    .limit(limit);
}

// ── Fetch a single question (for server-side validation) ───────────────────

export async function getQuestion(questionId: string): Promise<Question | null> {
  const [row] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);
  return row ?? null;
}

// ── Strip correctAnswer from a question before sending to client ───────────
// Use this in every API response — NEVER send correctAnswer to the browser.

export function stripAnswerFromQuestion(question: Question): Omit<Question, 'correctAnswer' | 'embedding'> & {
  options: Array<{ id: string; text: string }>; // No isCorrect field
} {
  const { correctAnswer: _correctAnswer, embedding: _embedding, options, ...safe } = question;

  // Strip isCorrect from options for MCQ/MSQ
  const safeOptions = (options as Array<{ id: string; text: string; isCorrect?: boolean }> | null)?.map(
    ({ isCorrect: _ic, ...opt }) => opt,
  ) ?? [];

  return { ...safe, options: safeOptions };
}
