import { describe, it, expect } from 'vitest';
import { computeNextReview, initialSpacedRepState } from '@/lib/mastery/spaced-rep';

describe('computeNextReview', () => {
  it('initializes with default ease factor 2.5', () => {
    const state = initialSpacedRepState();
    expect(state.easeFactor).toBe(2.5);
    expect(state.repetitionCount).toBe(0);
    expect(state.intervalDays).toBe(1);
  });

  it('sets next review to tomorrow for first successful attempt', () => {
    const state = initialSpacedRepState();
    const result = computeNextReview(state, 90); // MASTERED
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(result.nextReviewAt.getDate()).toBe(tomorrow.getDate());
    expect(result.repetitionCount).toBe(1);
  });

  it('sets 6-day interval on second successful attempt', () => {
    const first = computeNextReview(initialSpacedRepState(), 90);
    const second = computeNextReview(first, 85);
    expect(second.intervalDays).toBe(6);
    expect(second.repetitionCount).toBe(2);
  });

  it('increases interval exponentially for mastered content', () => {
    let state = initialSpacedRepState();
    state = computeNextReview(state, 90);  // 1 day
    state = computeNextReview(state, 90);  // 6 days
    state = computeNextReview(state, 90);  // ~15 days (6 * 2.5)
    expect(state.intervalDays).toBeGreaterThan(10);
    expect(state.repetitionCount).toBe(3);
  });

  it('resets interval for failed attempt (WEAK)', () => {
    let state = initialSpacedRepState();
    state = computeNextReview(state, 90);
    state = computeNextReview(state, 90);
    // Student fails — interval should reset
    state = computeNextReview(state, 30); // WEAK
    expect(state.intervalDays).toBe(1);
    expect(state.repetitionCount).toBe(0);
  });

  it('decreases ease factor for difficult content', () => {
    const state = initialSpacedRepState();
    const difficult = computeNextReview(state, 65); // NEEDS_REVIEW
    expect(difficult.easeFactor).toBeLessThan(2.5);
  });

  it('never decreases ease factor below 1.3', () => {
    let state = initialSpacedRepState();
    // Simulate many wrong answers
    for (let i = 0; i < 20; i++) {
      state = computeNextReview(state, 10);
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
