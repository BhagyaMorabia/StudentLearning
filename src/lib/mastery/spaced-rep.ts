/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm (Wozniak, 1987).
 * Quality score maps JEE mastery levels to SM-2 performance grades:
 *   - MASTERED (score ≥ 85) → quality 5 (perfect)
 *   - NEEDS_REVIEW (60–84) → quality 3 (correct with difficulty)
 *   - WEAK (< 60)           → quality 1 (incorrect, remembered solution)
 *
 * The algorithm increases intervals for well-mastered content and
 * resets them for poorly mastered content, minimizing review time
 * while maintaining retention.
 */

export interface SpacedRepState {
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
  nextReviewAt: Date;
}

/**
 * Compute the next review date for a subtopic after a quiz attempt.
 *
 * @param current  Current SM-2 state (from student_mastery table)
 * @param masteryScore  0–100 score from computeMastery()
 * @returns New SM-2 state to save to student_mastery
 */
export function computeNextReview(
  current: SpacedRepState,
  masteryScore: number,
): SpacedRepState {
  // Convert mastery score to SM-2 quality (0–5)
  const quality = scoreToQuality(masteryScore);

  let { intervalDays, easeFactor, repetitionCount } = current;

  if (quality >= 3) {
    // Correct response — increase interval
    if (repetitionCount === 0) {
      intervalDays = 1;
    } else if (repetitionCount === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitionCount += 1;
  } else {
    // Incorrect response — reset to beginning
    repetitionCount = 0;
    intervalDays = 1;
  }

  // Update ease factor (keeps interval from growing too fast or too slow)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(
    1.3, // Minimum ease factor — prevents intervals from shrinking to nothing
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + Math.round(intervalDays));

  return {
    intervalDays,
    easeFactor,
    repetitionCount,
    nextReviewAt,
  };
}

/**
 * Convert a mastery score (0–100) to SM-2 quality grade (0–5).
 * This is the bridge between the mastery algorithm and spaced repetition.
 */
function scoreToQuality(masteryScore: number): number {
  if (masteryScore >= 90) return 5; // Perfect
  if (masteryScore >= 80) return 4; // Correct, slight hesitation
  if (masteryScore >= 65) return 3; // Correct with difficulty
  if (masteryScore >= 50) return 2; // Incorrect but easy to remember
  if (masteryScore >= 30) return 1; // Incorrect, remembered solution
  return 0;                          // Complete blackout
}

/**
 * Initial SM-2 state for a subtopic the student has never attempted.
 */
export function initialSpacedRepState(): SpacedRepState {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    intervalDays: 1,
    easeFactor: 2.5, // SM-2 default
    repetitionCount: 0,
    nextReviewAt: tomorrow,
  };
}
