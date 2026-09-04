# NeuralJEE — V4 Mastery Algorithm Evaluation Results (Bayesian Score Engine)

_Generated: 2026-09-03T11:11:32.660492+00:00_

- Questions per profile: **5**
- Total evaluations: **35**
- Random seed: `42`

## Headline Metrics (Three reported)

### A) Profile Diagnostic Accuracy
REAL METRIC. Given click+telemetry of student with known profile X, did classifyFailureModeV3() return X?

**Overall: 48.57% (17/35)**

### B) Option-Tag Match Rate
DATA-QUALITY metric. Did classification match misconceptionType tag of the EXACT option clicked?

**Overall: 80.77% (21/26)**

### C) MODE_7 Forgetting Wrong-Answer Recall
Pedagogically-critical. When retrievability is low AND answer is wrong, did we diagnose MODE_7 (review needed) instead of re-teaching?

**100.0% (2/2)**

## Per-Profile Breakdown (Metric A)

| Profile | Correct | Total | Accuracy |
|---|---|---|---|
| MODE_1_PREREQUISITE | 1 | 5 | 20.0% |
| MODE_2_CONCEPTUAL | 3 | 5 | 60.0% |
| MODE_3_PROCEDURAL | 5 | 5 | 100.0% |
| MODE_4_FORMULA | 1 | 5 | 20.0% |
| MODE_5_CARELESS | 0 | 5 | 0.0% |
| MODE_6_GUESSING | 2 | 5 | 40.0% |
| MODE_7_FORGETTING | 5 | 5 | 100.0% |

## Per-Mode Diagnostic Quality (Precision / Recall / F1)

| Mode | Precision | Recall | F1 |
|---|---|---|---|
| MODE_1_PREREQUISITE | 12.5% | 16.7% | 14.3% |
| MODE_2_CONCEPTUAL | 20.0% | 37.5% | 26.1% |
| MODE_3_PROCEDURAL | 50.0% | 28.6% | 36.4% |
| MODE_4_FORMULA | 0.0% | 0.0% | 0.0% |
| MODE_5_CARELESS | 0.0% | 0.0% | 0.0% |
| MODE_6_GUESSING | 50.0% | 28.6% | 36.4% |
| MODE_7_FORGETTING | 50.0% | 28.6% | 36.4% |

## V4 Engine Changes Applied

- Bayesian score accumulation replaced hard Priority 1-6 winner-take-all.
- Engagement-gated option tag weight (0 below timeRatio=0.2, linear ramp to 1.0 at 0.5).
- prerequisiteTrapId elevation (+1.0 MODE_1 regardless of option tag).
- MODE_7 wrong-answer boost (+1.2 MODE_7 when isRetrievabilityLow on wrong answers).
- Calibrated telemetry weights: rushed-careless signature 0.2-0.5x ratio now adds +0.8 to MODE_5.
