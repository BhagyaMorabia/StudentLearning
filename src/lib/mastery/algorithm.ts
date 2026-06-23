/**
 * Mastery score computation algorithm.
 *
 * Weighted composite of three signals:
 *   - Accuracy (60%): correct / total
 *   - Consistency (25%): penalizes lucky guesses and inconsistent answers
 *   - Time confidence (15%): answers in expected window score higher
 *
 * Score 0–100. Thresholds: MASTERED >= 85, NEEDS_REVIEW >= 60, else WEAK.
 */

export interface QuestionAttemptInput {
  questionId: string;
  isCorrect: boolean;
  timeSpentMs: number;
  conceptsTested: string[];
  expectedTimeSeconds: number;
}

export interface MasteryResult {
  masteryScore: number; // 0–100
  status: 'WEAK' | 'NEEDS_REVIEW' | 'MASTERED';
  weakConceptTags: string[];
  consistencyScore: number; // 0–1
  timeConfidenceScore: number; // 0–1
  accuracy: number; // 0–1
  totalAttempted: number;
  totalCorrect: number;
  avgTimeMs: number;
}

export function computeMastery(attempts: QuestionAttemptInput[]): MasteryResult {
  if (attempts.length === 0) {
    return {
      masteryScore: 0,
      status: 'WEAK',
      weakConceptTags: [],
      consistencyScore: 0,
      timeConfidenceScore: 0,
      accuracy: 0,
      totalAttempted: 0,
      totalCorrect: 0,
      avgTimeMs: 0,
    };
  }

  const correct = attempts.filter((a) => a.isCorrect);
  const accuracy = correct.length / attempts.length;
  const consistencyScore = computeConsistency(attempts);
  const timeConfidenceScore = computeTimeConfidence(attempts);

  // Weighted composite
  const masteryScore = Math.min(
    100,
    Math.round(accuracy * 60 + consistencyScore * 25 + timeConfidenceScore * 15),
  );

  const weakConceptTags = extractWeakConcepts(attempts);

  const status: MasteryResult['status'] =
    masteryScore >= 85 ? 'MASTERED' : masteryScore >= 60 ? 'NEEDS_REVIEW' : 'WEAK';

  const avgTimeMs =
    attempts.reduce((sum, a) => sum + a.timeSpentMs, 0) / attempts.length;

  return {
    masteryScore,
    status,
    weakConceptTags,
    consistencyScore,
    timeConfidenceScore,
    accuracy,
    totalAttempted: attempts.length,
    totalCorrect: correct.length,
    avgTimeMs: Math.round(avgTimeMs),
  };
}

// ── Consistency: consecutive correct answers score higher ──────────────────
// Penalizes students who alternate right/wrong (lucky guessing pattern).

function computeConsistency(attempts: QuestionAttemptInput[]): number {
  if (attempts.length <= 1) return attempts[0]?.isCorrect ? 1 : 0;

  let totalScore = 0;
  let comparisons = 0;

  for (let i = 1; i < attempts.length; i++) {
    const prev = attempts[i - 1];
    const curr = attempts[i];

    if (prev.isCorrect === curr.isCorrect) {
      // Consistent result — full credit if both correct, zero if both wrong
      totalScore += curr.isCorrect ? 1 : 0;
    } else {
      // Inconsistent — partial credit (might be transitioning from wrong to right)
      totalScore += 0.3;
    }
    comparisons++;
  }

  return comparisons > 0 ? totalScore / comparisons : 0;
}

// ── Time confidence: too fast = guessing, too slow = struggling ─────────────
// Answers within 50%–150% of expected time score 1.0.

function computeTimeConfidence(attempts: QuestionAttemptInput[]): number {
  const scores = attempts.map((a) => {
    const expectedMs = a.expectedTimeSeconds * 1000;
    const ratio = a.timeSpentMs / expectedMs;

    if (ratio < 0.15) return 0.2; // Extremely fast = almost certainly guessing
    if (ratio < 0.4) return 0.6;  // Fast — could be guessing
    if (ratio <= 1.5) return 1.0; // Normal speed — confident understanding
    if (ratio <= 2.5) return 0.8; // Slightly slow — working through it
    if (ratio <= 4.0) return 0.5; // Very slow — struggling
    return 0.3;                    // Extremely slow — stuck
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ── Extract concepts the student consistently gets wrong ───────────────────
// Returns concepts where > 50% of attempts were incorrect.

export function extractWeakConcepts(attempts: QuestionAttemptInput[]): string[] {
  const conceptCounts = new Map<string, { wrong: number; total: number }>();

  for (const attempt of attempts) {
    for (const concept of attempt.conceptsTested) {
      const current = conceptCounts.get(concept) ?? { wrong: 0, total: 0 };
      conceptCounts.set(concept, {
        wrong: current.wrong + (attempt.isCorrect ? 0 : 1),
        total: current.total + 1,
      });
    }
  }

  return [...conceptCounts.entries()]
    .filter(([, counts]) => counts.total > 0 && counts.wrong / counts.total > 0.5)
    .map(([concept]) => concept);
}
