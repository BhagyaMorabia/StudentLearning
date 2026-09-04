import { fsrs, createEmptyCard, Rating, type Card, type CardInput } from 'ts-fsrs';

/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm
 * 
 * Replaces legacy SM-2 with modern DSR (Difficulty, Stability, Retrievability) modeling.
 * 
 * Quality score maps JEE mastery levels to FSRS Ratings:
 *   - MASTERED (score ≥ 85)     → Rating.Easy
 *   - NEEDS_REVIEW (60–84)      → Rating.Good
 *   - WEAK (30-59)              → Rating.Hard
 *   - COMPLETE BLACKOUT (< 30)  → Rating.Again
 */

// Initialize FSRS with default parameters
const f = fsrs();

/**
 * Compute the next review state for a subtopic after a quiz attempt.
 *
 * @param currentCard  Current FSRS Card state (from studentMastery.fsrsState)
 * @param masteryScore  0–100 score from computeMastery()
 * @returns New FSRS Card state to save to student_mastery
 */
export function computeNextReview(
  currentCard: unknown,
  masteryScore: number,
  now: Date = new Date()
): Card {
  const card = normalizeCard(currentCard, now);

  // Convert mastery score to FSRS Rating
  const rating = scoreToRating(masteryScore);

  // Compute the next state
  const schedulingCards = f.repeat(card, now);
  
  // Return the specific card state based on the rating they achieved
  const nextRecord = (schedulingCards as unknown as Record<number, { card: Card }>)[rating];
  
  return nextRecord.card;
}

function normalizeCard(currentCard: unknown, now: Date): Card | CardInput {
  if (!currentCard || typeof currentCard !== 'object') {
    return createEmptyCard(now);
  }

  const storedCard = currentCard as Partial<CardInput>;

  return {
    ...storedCard,
    due: new Date(storedCard.due ?? now),
    last_review: storedCard.last_review ? new Date(storedCard.last_review) : undefined,
  } as CardInput;
}

/**
 * Convert a mastery score (0–100) to FSRS Rating.
 */
function scoreToRating(masteryScore: number): Rating {
  if (masteryScore >= 85) return Rating.Easy;   // 4: Easy
  if (masteryScore >= 60) return Rating.Good;   // 3: Good
  if (masteryScore > 30) return Rating.Hard;    // 2: Hard
  return Rating.Again;                          // 1: Again
}

/**
 * Get an initial FSRS Card (for pre-populating or default states)
 */
export function initialSpacedRepState(): Card {
  return createEmptyCard(new Date());
}
