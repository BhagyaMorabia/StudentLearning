import type { MasteryScore, MasteryStatus, QuizQuestion, SubtopicResult, QuizResults, Question } from "./types";
import { calculateMasteryStatus } from "./utils";

/**
 * Core mastery algorithm.
 * After a quiz session, calculates per-subtopic scores and updates mastery.
 * 
 * Thresholds:
 *   ≥85% → MASTERED
 *   50-84% → LEARNING
 *   <50% → WEAK
 *   0 attempts → NOT_STARTED
 * 
 * The algorithm also tracks streaks for adaptive difficulty
 * and supports negative marking (JEE-style).
 */

const MASTERY_THRESHOLD = 85;
const LEARNING_THRESHOLD = 50;

export function calculateSubtopicResults(
  quizQuestions: QuizQuestion[],
  questions: Question[],
  subtopicMap: Record<string, string> // subtopicId → subtopicName
): SubtopicResult[] {
  // Group responses by subtopic
  const grouped: Record<string, { total: number; correct: number }> = {};

  for (const qq of quizQuestions) {
    const subtopicId = qq.question.subtopicId;
    if (!grouped[subtopicId]) {
      grouped[subtopicId] = { total: 0, correct: 0 };
    }
    grouped[subtopicId].total++;
    if (qq.isCorrect) {
      grouped[subtopicId].correct++;
    }
  }

  return Object.entries(grouped).map(([subtopicId, data]) => {
    const score = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    return {
      subtopicId,
      subtopicName: subtopicMap[subtopicId] || "Unknown",
      totalQuestions: data.total,
      correctAnswers: data.correct,
      score: Math.round(score * 100) / 100,
      status: calculateMasteryStatus(score),
    };
  });
}

export function calculateQuizResults(
  sessionId: string,
  quizQuestions: QuizQuestion[],
  questions: Question[],
  subtopicMap: Record<string, string>
): QuizResults {
  const subtopicResults = calculateSubtopicResults(quizQuestions, questions, subtopicMap);
  
  const totalQuestions = quizQuestions.length;
  const correctAnswers = quizQuestions.filter(q => q.isCorrect).length;
  const totalScore = quizQuestions.reduce((sum, q) => sum + q.marksAwarded, 0);
  const maxScore = quizQuestions.reduce((sum, q) => sum + q.question.positiveMarks, 0);
  const timeTaken = quizQuestions.reduce((sum, q) => sum + q.timeTakenSeconds, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return {
    sessionId,
    totalQuestions,
    correctAnswers,
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    timeTaken,
    subtopicResults,
    weakSubtopics: subtopicResults.filter(r => r.status === "weak"),
    masteredSubtopics: subtopicResults.filter(r => r.status === "mastered"),
  };
}

export function updateMasteryScore(
  existing: MasteryScore | null,
  subtopicResult: SubtopicResult
): MasteryScore {
  if (!existing) {
    return {
      subtopicId: subtopicResult.subtopicId,
      score: subtopicResult.score,
      totalAttempts: subtopicResult.totalQuestions,
      correctAttempts: subtopicResult.correctAnswers,
      streak: subtopicResult.correctAnswers > 0 ? subtopicResult.correctAnswers : 0,
      masteryStatus: subtopicResult.status,
      lastTestedAt: new Date().toISOString(),
    };
  }

  // Exponential moving average — recent performance weighted more
  const alpha = 0.6; // weight for new score
  const newScore = alpha * subtopicResult.score + (1 - alpha) * existing.score;
  const totalAttempts = existing.totalAttempts + subtopicResult.totalQuestions;
  const correctAttempts = existing.correctAttempts + subtopicResult.correctAnswers;

  // Update streak
  let streak = existing.streak;
  if (subtopicResult.score >= MASTERY_THRESHOLD) {
    streak++;
  } else {
    streak = 0;
  }

  return {
    subtopicId: subtopicResult.subtopicId,
    score: Math.round(newScore * 100) / 100,
    totalAttempts,
    correctAttempts,
    streak,
    masteryStatus: calculateMasteryStatus(newScore),
    lastTestedAt: new Date().toISOString(),
  };
}

/**
 * Determines which subtopics need remediation.
 * Returns subtopic IDs sorted by weakness (worst first).
 */
export function getWeakSubtopics(
  masteryScores: MasteryScore[]
): string[] {
  return masteryScores
    .filter(m => m.masteryStatus === "weak" || m.masteryStatus === "learning")
    .sort((a, b) => a.score - b.score) // weakest first
    .map(m => m.subtopicId);
}

/**
 * Checks if a chapter is fully mastered.
 */
export function isChapterMastered(
  masteryScores: MasteryScore[],
  subtopicIds: string[]
): boolean {
  return subtopicIds.every(id => {
    const score = masteryScores.find(m => m.subtopicId === id);
    return score && score.masteryStatus === "mastered";
  });
}

/**
 * Calculates overall chapter mastery percentage.
 */
export function getChapterMasteryPercentage(
  masteryScores: MasteryScore[],
  subtopicIds: string[]
): number {
  if (subtopicIds.length === 0) return 0;
  const mastered = subtopicIds.filter(id => {
    const score = masteryScores.find(m => m.subtopicId === id);
    return score && score.masteryStatus === "mastered";
  }).length;
  return Math.round((mastered / subtopicIds.length) * 100);
}

/**
 * Adaptive difficulty selection.
 * Based on recent performance, selects appropriate difficulty for next questions.
 */
export function getAdaptiveDifficulty(
  mastery: MasteryScore | null
): { min: number; max: number } {
  if (!mastery || mastery.totalAttempts === 0) {
    return { min: 1, max: 2 }; // Start easy
  }

  if (mastery.streak >= 3) {
    // Student is on a roll — increase difficulty
    const base = Math.min(mastery.score >= 85 ? 3 : 2, 4);
    return { min: base, max: Math.min(base + 2, 5) };
  }

  if (mastery.score >= 85) {
    return { min: 3, max: 5 }; // JEE Main to Advanced
  }

  if (mastery.score >= 50) {
    return { min: 2, max: 4 }; // Easy to JEE Main
  }

  return { min: 1, max: 3 }; // NCERT to moderate
}

/**
 * Calculates marks for a question response (supports negative marking).
 */
export function calculateMarks(
  question: Question,
  userAnswer: string | null,
  isSkipped: boolean
): { isCorrect: boolean; marks: number } {
  if (isSkipped || !userAnswer) {
    return { isCorrect: false, marks: 0 };
  }

  const isCorrect = userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  if (isCorrect) {
    return { isCorrect: true, marks: question.positiveMarks };
  }

  // Negative marking applies for wrong answers (not for numerical types in JEE)
  if (question.questionType === "numerical" || question.questionType === "integer_type") {
    return { isCorrect: false, marks: 0 }; // No negative marking for numerical
  }

  return { isCorrect: false, marks: -question.negativeMarks };
}
