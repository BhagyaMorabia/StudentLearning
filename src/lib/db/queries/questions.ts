import { db } from '@/lib/db/client';
import { questions, subtopics, topics, chapters } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { Question } from '@/lib/db/schema';
import type { ClientQuestion } from '@/lib/ai/schemas';

// ── Fetch questions for quiz generation ────────────────────────────────────
// IMPORTANT: Never expose correctAnswer or options[].isCorrect to the client.
// The API route strips these fields before responding.

export async function getQuestionsForSubtopic(
  subtopicId: string,
  defaultLimit = 5,
): Promise<Question[]> {
  const [subtopicRow] = await db
    .select({ chapterId: topics.chapterId, weightage: chapters.jeeWeightagePct })
    .from(subtopics)
    .innerJoin(topics, eq(subtopics.topicId, topics.id))
    .innerJoin(chapters, eq(topics.chapterId, chapters.id))
    .where(eq(subtopics.id, subtopicId))
    .limit(1);

  const limit = (subtopicRow?.weightage && subtopicRow.weightage > 4) ? 8 : defaultLimit;

  const result = await db
    .select({
      id: questions.id,
      subtopicId: questions.subtopicId,
      questionText: questions.questionText,
      questionType: questions.questionType,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      solutionSteps: questions.solutionSteps,
      difficultyLevel: questions.difficultyLevel,
      expectedTimeSeconds: questions.expectedTimeSeconds,
      conceptsTested: questions.conceptsTested,
      yearAppeared: questions.yearAppeared,
      source: questions.source,
      status: questions.status,
      createdAt: questions.createdAt,
      embedding: questions.embedding,
    })
    .from(questions)
    .where(
      and(
        eq(questions.subtopicId, subtopicId),
        eq(questions.status, 'VERIFIED'),
      ),
    )
    .orderBy(sql`random()`)
    .limit(limit);
    
    if (result.length === 0) {
      if (subtopicRow?.chapterId) {
        return getQuestionsForChapter(subtopicRow.chapterId, limit);
      }
    }
    
    return result;
  }

export async function getQuestionsForChapter(
  chapterId: string,
  defaultLimit = 10,
): Promise<Question[]> {
  const [chapterRow] = await db
    .select({ weightage: chapters.jeeWeightagePct })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);

  const limit = (chapterRow?.weightage && chapterRow.weightage > 4) ? 15 : defaultLimit;

  const randomQuestions = await db
    .select({
      id: questions.id,
      subtopicId: questions.subtopicId,
      questionText: questions.questionText,
      questionType: questions.questionType,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      solutionSteps: questions.solutionSteps,
      difficultyLevel: questions.difficultyLevel,
      expectedTimeSeconds: questions.expectedTimeSeconds,
      conceptsTested: questions.conceptsTested,
      yearAppeared: questions.yearAppeared,
      source: questions.source,
      status: questions.status,
      createdAt: questions.createdAt,
      embedding: questions.embedding,
    })
    .from(questions)
    .innerJoin(subtopics, eq(questions.subtopicId, subtopics.id))
    .innerJoin(topics, eq(subtopics.topicId, topics.id))
    .where(
      and(
        eq(topics.chapterId, chapterId),
        eq(questions.status, 'VERIFIED'),
      ),
    )
    .orderBy(sql`random()`)
    .limit(limit);

  // Sort them in memory by difficulty (easy to hard)
  return randomQuestions.sort((a, b) => (a.difficultyLevel ?? 3) - (b.difficultyLevel ?? 3));
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

// ── Fetch similar questions for diagnostic engine ────────────────────────────

export async function getSimilarDiagnosticQuestions(
  questionId: string,
  queryEmbedding: number[],
  targetDifficulty: number,
  limit = 3,
): Promise<Question[]> {
  const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

  const result = await db.execute(sql`
    SELECT *
    FROM questions
    WHERE id != ${questionId}::uuid
      AND status = 'VERIFIED'
      AND difficulty_level <= ${targetDifficulty}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingLiteral}::vector
    LIMIT ${limit}
  `);

  // Transform rows to match Question type by camelCasing keys
  // pg gives us snake_case for everything in db.execute
  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    subtopicId: row.subtopic_id,
    questionText: row.question_text,
    questionType: row.question_type,
    options: row.options,
    correctAnswer: row.correct_answer,
    solutionSteps: row.solution_steps,
    difficultyLevel: row.difficulty_level,
    expectedTimeSeconds: row.expected_time_seconds,
    conceptsTested: row.concepts_tested,
    yearAppeared: row.year_appeared,
    source: row.source,
    status: row.status,
    embedding: row.embedding,
    createdAt: row.created_at,
  })) as Question[];
}

// ── Strip correctAnswer from a question before sending to client ───────────
// Use this in every API response — NEVER send correctAnswer to the browser.

export function stripAnswerFromQuestion(question: Question): ClientQuestion {
  const safeOptions = (
    question.options as Array<{ id?: unknown; text?: unknown }> | null
  )?.map((option) => ({
    id: String(option.id ?? ''),
    text: String(option.text ?? ''),
  })) ?? null;

  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    options: safeOptions,
    difficultyLevel: question.difficultyLevel ?? 3,
    expectedTimeSeconds: question.expectedTimeSeconds ?? 120,
    conceptsTested: question.conceptsTested ?? [],
  };
}
