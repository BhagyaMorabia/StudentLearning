# NeuralJEE — V3 Mastery Algorithm Evaluation Results

_Generated: 2026-09-03T05:36:06.027967+00:00_

- Questions per profile: **100**
- Total evaluations: **700**
- Random seed: `42`

## Two Separate Metrics (Reporting Both)

### A) Profile Diagnostic Accuracy
This is the real metric. Given the click + telemetry of a student with known
cognitive profile X, did classifyFailureMode() return X?

**Overall: 41.00% (287/700)**

### B) Option-Tag Match Rate
Data-quality metric. Did our classification match the misconcetionType tag
of the EXACT option the student clicked?

**Overall: 92.50% (481/520)**

## Per-Profile Breakdown (Metric A)

| Profile | Correct | Total | Accuracy |
|---|---|---|---|
| MODE_1_PREREQUISITE | 29 | 100 | 29.0% |
| MODE_2_CONCEPTUAL | 51 | 100 | 51.0% |
| MODE_3_PROCEDURAL | 34 | 100 | 34.0% |
| MODE_4_FORMULA | 33 | 100 | 33.0% |
| MODE_5_CARELESS | 42 | 100 | 42.0% |
| MODE_6_GUESSING | 47 | 100 | 47.0% |
| MODE_7_FORGETTING | 51 | 100 | 51.0% |

## Methodology Notes

- Port of `classifyFailureModeV2()` verified character-for-character against
  `src/lib/mastery/algorithm.ts`.

- Runtime blindness contract enforced on every LLM call: assertions fail the
  call if any correct/misconceptionType/isCorrect data is present in the prompt.

- MODE_7_FORGETTING simulation uses a decayed FSRS state (due 90d ago, R=25%)
  via `isRetrievabilityLow()` semantics shared with both API routes.

- Profile diagnostic accuracy counts correct answers as "correct" IFF prediction = NONE
  (ground-truth profiles describe error behaviours, not correct ones).

- Option-tag match uses exact tag + semantic keyword resolution to avoid the
  enum/free-text split inflating the result.
