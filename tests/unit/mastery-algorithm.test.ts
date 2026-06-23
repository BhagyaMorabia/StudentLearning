import { describe, it, expect } from 'vitest';
import { computeMastery, extractWeakConcepts } from '@/lib/mastery/algorithm';
import type { QuestionAttemptInput } from '@/lib/mastery/algorithm';

const makeAttempt = (
  overrides: Partial<QuestionAttemptInput> = {},
): QuestionAttemptInput => ({
  questionId: 'q1',
  isCorrect: true,
  timeSpentMs: 60_000,
  conceptsTested: ['Newton\'s Second Law'],
  expectedTimeSeconds: 60,
  ...overrides,
});

describe('computeMastery', () => {
  it('returns zero mastery for empty attempts', () => {
    const result = computeMastery([]);
    expect(result.masteryScore).toBe(0);
    expect(result.status).toBe('WEAK');
    expect(result.totalAttempted).toBe(0);
  });

  it('returns MASTERED for 5/5 correct at expected pace', () => {
    const attempts = Array(5).fill(null).map(() =>
      makeAttempt({ isCorrect: true, timeSpentMs: 60_000, expectedTimeSeconds: 60 }),
    );
    const result = computeMastery(attempts);
    expect(result.masteryScore).toBeGreaterThanOrEqual(85);
    expect(result.status).toBe('MASTERED');
    expect(result.accuracy).toBe(1);
  });

  it('returns WEAK for 0/5 correct', () => {
    const attempts = Array(5).fill(null).map(() =>
      makeAttempt({ isCorrect: false }),
    );
    const result = computeMastery(attempts);
    expect(result.masteryScore).toBeLessThan(60);
    expect(result.status).toBe('WEAK');
  });

  it('penalizes very fast answers (guessing)', () => {
    const fastAttempts = Array(5).fill(null).map(() =>
      makeAttempt({ isCorrect: true, timeSpentMs: 1_000, expectedTimeSeconds: 60 }),
    );
    const normalAttempts = Array(5).fill(null).map(() =>
      makeAttempt({ isCorrect: true, timeSpentMs: 60_000, expectedTimeSeconds: 60 }),
    );

    const fast = computeMastery(fastAttempts);
    const normal = computeMastery(normalAttempts);

    expect(fast.timeConfidenceScore).toBeLessThan(normal.timeConfidenceScore);
  });

  it('penalizes inconsistent answers', () => {
    const inconsistent = Array(4).fill(null).map((_, i) =>
      makeAttempt({ isCorrect: i % 2 === 0 }),
    );
    const consistent = Array(4).fill(null).map(() =>
      makeAttempt({ isCorrect: true }),
    );

    const inconsistentResult = computeMastery(inconsistent);
    const consistentResult = computeMastery(consistent);

    expect(inconsistentResult.consistencyScore).toBeLessThan(consistentResult.consistencyScore);
  });

  it('correctly computes accuracy', () => {
    const attempts = [
      makeAttempt({ isCorrect: true }),
      makeAttempt({ isCorrect: true }),
      makeAttempt({ isCorrect: false }),
      makeAttempt({ isCorrect: true }),
    ];
    const result = computeMastery(attempts);
    expect(result.accuracy).toBeCloseTo(0.75, 2);
    expect(result.totalCorrect).toBe(3);
    expect(result.totalAttempted).toBe(4);
  });
});

describe('extractWeakConcepts', () => {
  it('returns empty for all correct answers', () => {
    const attempts = [
      makeAttempt({ conceptsTested: ['Kinematics'] }),
      makeAttempt({ conceptsTested: ['Kinematics'] }),
    ];
    expect(extractWeakConcepts(attempts)).toEqual([]);
  });

  it('flags concepts with >50% wrong rate', () => {
    const attempts = [
      makeAttempt({ isCorrect: false, conceptsTested: ['Vectors'] }),
      makeAttempt({ isCorrect: false, conceptsTested: ['Vectors'] }),
      makeAttempt({ isCorrect: true, conceptsTested: ['Vectors'] }),
    ];
    const weak = extractWeakConcepts(attempts);
    expect(weak).toContain('Vectors');
  });

  it('does not flag concepts with exactly 50% wrong', () => {
    const attempts = [
      makeAttempt({ isCorrect: false, conceptsTested: ['Thermodynamics'] }),
      makeAttempt({ isCorrect: true, conceptsTested: ['Thermodynamics'] }),
    ];
    const weak = extractWeakConcepts(attempts);
    expect(weak).not.toContain('Thermodynamics');
  });

  it('handles multiple concepts per attempt', () => {
    const attempts = [
      makeAttempt({ isCorrect: false, conceptsTested: ['Magnetism', 'Flux'] }),
      makeAttempt({ isCorrect: false, conceptsTested: ['Magnetism', 'Flux'] }),
    ];
    const weak = extractWeakConcepts(attempts);
    expect(weak).toContain('Magnetism');
    expect(weak).toContain('Flux');
  });
});
