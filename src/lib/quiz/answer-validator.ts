/**
 * answer-validator.ts
 *
 * Single source of truth for validating a student's `selectedAnswer` against
 * a question's ground-truth `correctAnswer` plus MCQ/MSQ option metadata.
 *
 * Previously these two helpers were copy-pasted identically between
 * /api/quiz/submit/route.ts and /api/quiz/evaluate/route.ts — any bug fix
 * in one copy would silently leave the other broken.
 *
 * Types intentionally use `unknown` on the input boundaries because
 * `correctAnswer` and `options` come from JSONB columns and the client's
 * `selectedAnswer` comes over the wire.
 */

export type CorrectAnswerShape = {
  value?: string | number | null;
  values?: string[] | null;
  tolerance?: number | null;
};

export type OptionMetaShape = {
  id?: unknown;
  misconceptionType?: string | null;
  prerequisiteTrapId?: string | null;
  [k: string]: unknown;
};

export function validateAnswer(
  questionType: string,
  correctAnswer: unknown,
  selectedAnswer: unknown,
): boolean {
  const correct = (correctAnswer ?? {}) as CorrectAnswerShape;

  switch (questionType) {
    case 'MCQ': {
      return String(selectedAnswer ?? '') === String(correct.value ?? '');
    }

    case 'MSQ': {
      const selected = new Set(
        Array.isArray(selectedAnswer)
          ? selectedAnswer.filter((v): v is string | number => v !== null && v !== undefined).map(String)
          : [],
      );
      const expected = new Set(
        (correct.values ?? []).filter((v): v is string => v !== null && v !== undefined).map(String),
      );
      if (selected.size !== expected.size) return false;
      for (const value of selected) {
        if (!expected.has(value)) return false;
      }
      return true;
    }

    case 'INTEGER': {
      const parsed = Number(selectedAnswer);
      if (Number.isNaN(parsed) || !Number.isInteger(parsed)) return false;
      return parsed === Number(correct.value);
    }

    case 'NUMERICAL': {
      const parsed = Number(selectedAnswer);
      if (Number.isNaN(parsed)) return false;
      const tolerance =
        typeof correct.tolerance === 'number' && Number.isFinite(correct.tolerance)
          ? correct.tolerance
          : 0.01;
      return Math.abs(parsed - Number(correct.value)) <= tolerance;
    }

    default:
      return false;
  }
}

export function findSelectedOptionMetadata(
  options: unknown,
  selectedAnswer: unknown,
): (OptionMetaShape & { id?: string }) | null {
  if (!Array.isArray(options)) return null;

  const selectedIds = new Set(
    Array.isArray(selectedAnswer)
      ? selectedAnswer.map((v) => String(v))
      : [String(selectedAnswer)],
  );

  const found = options.find((option) => {
    if (!option || typeof option !== 'object') return false;
    const id = (option as OptionMetaShape).id;
    if (id === undefined || id === null) return false;
    return selectedIds.has(String(id));
  }) as (OptionMetaShape & { id?: string }) | undefined;

  return found ?? null;
}
