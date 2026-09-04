import { describe, it, expect } from 'vitest';
import { computeNextReview, initialSpacedRepState } from '@/lib/mastery/spaced-rep';

describe('computeNextReview (FSRS)', () => {
  it('initializes with default state', () => {
    const state = initialSpacedRepState();
    expect(state.state).toBe(0); // New Card
    expect(state.reps).toBe(0);
  });

  it('increases reps and state for successful attempt', () => {
    const state = initialSpacedRepState();
    const result = computeNextReview(state, 90); // MASTERED (Rating.Easy)
    
    expect(result.reps).toBe(1);
    expect(result.state).toBeGreaterThan(0); // Should be Review (2) or Learning (1) depending on FSRS config
  });

  it('increases stability on repeated successful attempts', () => {
    const first = computeNextReview(initialSpacedRepState(), 90);
    const second = computeNextReview(first, 85);
    
    expect(second.reps).toBe(2);
    expect(second.stability).toBeGreaterThan(first.stability);
  });

  it('handles failed attempt (WEAK)', () => {
    let state = initialSpacedRepState();
    state = computeNextReview(state, 90);
    state = computeNextReview(state, 90);
    // Student fails — should register a lapse
    const failedState = computeNextReview(state, 30); // WEAK
    expect(failedState.lapses).toBe(1);
  });
});
