# NeuralJEE — V5.1 Mastery Algorithm Evaluation Report

_Generated: 2026-09-04T05:59:06.731817+00:00_

- Questions per profile: **100**
- Total evaluations: **700**
- Wrong-answer diagnostic cases: **597** (of which **182** correctly classified)
- Blindness violations: **0/700**
- LLM pipeline failures (clean-payload calls only): **0/700** (0.00%)
- Random seed: `42`

## ★ Headline Metric — Wrong-Answer Diagnostic Recall (A*)

**REAL PRODUCTION METRIC.** This is the number that actually drives pedagogy decisions. Given a student with a known cognitive profile who answered INCORRECTLY (so a diagnosis is needed), did `classifyFailureModeV3()` return their actual cognitive state? Excludes correct-answer `NONE` matches (trivial).

# 30.49% (182/597)

---

## Other Metrics (sanity / data-quality)

### A) Blended Profile Diagnostic Accuracy (sanity only)

Includes correct-answer `NONE` matches. Use this only for end-to-end sanity checks — it overstates real diagnostic accuracy by the fraction of correct answers.

**Overall: 62.86% (440/700)**

### B) Option-Tag Match Rate (data quality)

When the option the student clicked has a DB `misconceptionType` tag, does the classifier agree with the designer's label? Measures tag↔classifier alignment, not ground-truth cognitive-state accuracy.

**Overall: 72.29% (300/415)**

### C) MODE_7 Forgetting Wrong-Answer Recall

Pedagogically-critical special case. When FSRS retrievability is low AND answer is wrong, did we diagnose MODE_7 (scheduled review) instead of re-teaching as if it were a conceptual gap?

**79.5% (31/39)**

## Per-Profile Breakdown (Blended Metric A)

| Profile | Correct | Total | Accuracy |
|---|---|---|---|
| MODE_1_PREREQUISITE | 39 | 100 | 39.0% |
| MODE_2_CONCEPTUAL | 66 | 100 | 66.0% |
| MODE_3_PROCEDURAL | 100 | 100 | 100.0% |
| MODE_4_FORMULA | 38 | 100 | 38.0% |
| MODE_5_CARELESS | 49 | 100 | 49.0% |
| MODE_6_GUESSING | 56 | 100 | 56.0% |
| MODE_7_FORGETTING | 92 | 100 | 92.0% |

## Per-Mode WRONG-ANSWER-ONLY Diagnostic Quality (P / R / F1) — matches Metric A* population

> Population: only rows where `is_correct=False`. TP=GT=m ∧ Pred=m. **FP=GT≠m ∧ Pred=m** (correct-answer false positives are excluded — this measures diagnostic-precision on actual misdiagnosis attempts only). FN=GT=m ∧ Pred≠m.

| Mode | Precision (wrong) | Recall (wrong) | F1 (wrong) | TP_wrong | FP_wrong | FN_wrong |
|---|---|---|---|---|---|---|
| MODE_1_PREREQUISITE | 12.5% | 3.1% | 4.9% | 2 | 14 | 63 |
| MODE_2_CONCEPTUAL | 22.3% | 30.7% | 25.8% | 27 | 94 | 61 |
| MODE_3_PROCEDURAL | 56.5% | 50.0% | 53.0% | 48 | 37 | 48 |
| MODE_4_FORMULA | 36.0% | 18.4% | 24.3% | 18 | 32 | 80 |
| MODE_5_CARELESS | 28.2% | 23.2% | 25.4% | 22 | 56 | 73 |
| MODE_6_GUESSING | 100.0% | 40.0% | 57.1% | 34 | 0 | 51 |
| MODE_7_FORGETTING | 100.0% | 44.3% | 61.4% | 31 | 0 | 39 |

## V5.1 Changes Applied

- **P/R/F1 FP bug fixed**: FP sum no longer includes GT==m rows (precision was previously halved for every mode).
- **Wrong-answer-only P/R/F1**: TP/FP/FN all computed on `is_correct=False` subset so precision and recall describe the same population; F1 is now meaningful.
- **A* headline metric**: Micro-averaged wrong-answer diagnostic recall reported as the production-facing accuracy number.
- **LLM circuit-breaker refined**: failure rate computed only on calls that passed blindness checks (clean payloads); blindness-safe fallbacks no longer double-counted as LLM failures. Trigger threshold: >3% after first full profile (100 eligible calls).
- Bayesian score accumulation (V3 engine) instead of hard priority rules.
- Engagement-gated option tag weight (0 below timeRatio=0.2, linear ramp to 1.5 at engagement=1.0).
- prerequisiteTrapId elevation (+3.2 MODE_1 when designer-annotated prerequisite trap hit).
- MODE_7 wrong-answer FSRS retrievability boost (+2.5 MODE_7 when isRetrievabilityLow on wrong answers).
- Calibrated telemetry tiers: TIER-A procedural extreme +2.8, TIER-B formula-2switch +2.0, TIER-C careless rushed +1.85.
