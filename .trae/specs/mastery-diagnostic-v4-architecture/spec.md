# NeuralJEE Mastery Diagnostic V4 — Root-Cause Architecture Overhaul

## Problem

The V3 "human-brain priority" classifier achieves only **41.0% profile diagnostic accuracy (Metric A)** across 7 cognitive profiles (700 evaluations: 100 questions × 7 profiles). While the **option-tag match rate (Metric B) is 92.5%** — demonstrating that the option-tag signal is reliable when invoked — the hard priority-based classifier conflates "what the distractor was designed to trap" with "why the student actually clicked it." These are not the same thing.

A real JEE student with a **MODE_5_CARELESS** profile (rushing, arithmetic slips) may randomly click a distractor tagged **MODE_2_CONCEPTUAL** because they didn't engage with the nuance. The V3 classifier returns MODE_2_CONCEPTUAL — which matches the option tag (Metric B = [OK]) but misdiagnoses the student's actual cognitive state (Metric A = [NO]). This is the core failure.

### Root Causes (5 Identified from V3 Confusion Matrix)

**RC1 — Winner-Take-All Priority Instead of Evidence Accumulation**
Priority 2 rule: `if option.tag → return tag`. This zeroes out all orthogonal signals (telemetry engagement, memory state, prerequisite linkage). Empirical impact: MODE_5_CARELESS 37/100 misclassified as MODE_2_CONCEPTUAL; MODE_1_PREREQUISITE 38/100 misclassified as MODE_2_CONCEPTUAL.

**RC2 — Missing Engagement Gating on Option Tag Weight**
A student answering in 15% of expected time did NOT read the distractor's conceptual nuance. The option's misconceptionType tag (designed for an engaged reader) should have near-zero evidentiary value. V3 applies full weight regardless. Impact: MODE_6_GUESSING 18/100 misclassified as MODE_2_CONCEPTUAL (Priority 2 fires before Priority 1 because the ratio/abs thresholds are missed for some questions).

**RC3 — prerequisiteTrapId Structurally Suppressed by Priority 2**
Schema line 230: each option has BOTH `prerequisiteTrapId` AND `misconceptionType`. When both exist, Priority 2 (misconceptionType) always fires first — Priority 3 (prerequisite) is unreachable in practice. Confusion matrix proves it: `option_tag_confusion_matrix` has 0 rows for MODE_1. Result: MODE_1_PREREQUISITE accuracy = **29%** (worst of all 7).

**RC4 — MODE_7_FORGETTING Suppressed for Incorrect Answers**
When retrievability is low AND answer is wrong, the DISTAL cause is forgetting. The option tag tells us only the PROXIMAL manifestation (e.g., they forgot the formula → clicked a formula-tagged distractor). V3 returns MODE_4_FORMULA (pedagogically wrong: should review, not re-teach formulas). Impact: MODE_7 wrong answers 49/49 classified as other modes — NONE of them diagnosed as MODE_7.

**RC5 — Profile Simulation Overfits to Option Tags (Student Agent)**
Profile strategies instruct the LLM student actor to e.g. "flip a sign and pick the CARELESS distractor." This encourages preferential selection of distractors whose misconceptionType MATCHES the profile — inflating Metric B but hiding the real-world mismatch. The student actor should instead faithfully simulate the cognitive state even if the answer lands on a mismatched tag (which is what real students do).

## Goals

1. **Elevate Metric A (Profile Diagnostic Accuracy) from 41% → 65%+** without regressing Metric B below 85%.
2. **Fix the 4 worst-performing profiles specifically:**
   - MODE_1_PREREQUISITE: 29% → 55%+
   - MODE_3_PROCEDURAL: 34% → 55%+
   - MODE_4_FORMULA: 33% → 55%+
   - MODE_5_CARELESS: 42% → 55%+
3. **MODE_7_FORGETTING wrong-answer diagnosis:** Achieve ≥ 40% recall on incorrect answers with `isRetrievabilityLow=true`.
4. **Backward compatibility:** All existing callers of `classifyFailureMode()` (submit route, evaluate route) must work unchanged — the new score-accumulation engine is an internal implementation detail.

## Non-Goals

- NOT changing the database schema or question-bank tagging.
- NOT retraining or fine-tuning any LLM models.
- NOT changing the isRetrievabilityLow helper semantics (it's canonical).
- NOT changing the 7-mode taxonomy — the FailureMode enum is frozen.

## Functional Requirements

### FR1 — Bayesian Score Accumulation Classifier (algorithm.ts V3)
Replace hard Priority 1→6 rules with additive score accumulation across 7 modes:
- For each signal, add a calibrated evidence weight to the supported modes.
- Engagement gating: multiply option-tag evidence by `clamp(timeRatio / 0.5, 0, 1)`.
- Correct-path handling preserved: correct+fast → MODE_6; correct otherwise → NONE.

### FR2 — prerequisiteTrapId Structural Elevation
When an option has non-empty `prerequisiteTrapId`:
- Add +1.0 to MODE_1 score (strong — the question designer explicitly linked this distractor to a prerequisite gap).
- Do NOT subtract from option tag; both signals may co-evidence.

### FR3 — MODE_7 Forgetting Wrong-Answer Boost
When `isRetrievabilityLow && !isCorrect`:
- Add +1.2 to MODE_7 score (stronger than a single option tag hit).
- Only if GUESSING telemetry is NOT extreme (timeRatio < 0.2 → guessing takes precedence).

### FR4 — Telemetry Signal Calibration (relative, not absolute)
Time thresholds are ratios, not absolute seconds:
- Guessing zone: `timeRatio < 0.2` AND extreme-low engagement (option tag weight = 0).
- Careless zone: `timeRatio in [0.2, 0.5]` and `optionSwitchCount <= 1` (rushed but not zero-read).
- Procedural zone: `timeRatio > 1.5` AND `switches >= 2`.
- Formula indecision: `switches >= 2` AND `timeRatio in [0.5, 1.5]`.

### FR5 — Profile Prompt Hardening (student_agent.py + profiles.json)
Each profile strategy must explicitly acknowledge that the wrong answer may land on an option whose superficial misconceptionType does NOT match the cognitive root cause. The student actor must simulate the cognitive state (rushing, weak foundations, rusty memory) rather than hunting for a matching-tag distractor.

### FR6 — Rich Telemetry Output (run_eval.py)
Report per-mode precision/recall/F1, signal-contribution breakdown, and engagement distribution per profile.

## Non-Functional Requirements

### NFR1 — TypeScript + Python Exact Parity
The Python port of `classifyFailureModeV3` in run_eval.py must mirror the TypeScript implementation character-for-character. No drift.

### NFR2 — Zero Breaking API Changes
`classifyFailureMode(isCorrect, timeSpent, expected, switches, miscType, prereqId, lowR, histFast)` signature unchanged. New `classifyFailureModeV3` is the internal engine; V2 wraps it for backward compat.

### NFR3 — Determinism
Given identical inputs, classifier must return identical outputs across runs.

### NFR4 — Blindness Contract Preserved
No change to the student-agent blindness enforcement; all existing assertions must still pass.

## Constraints & Dependencies

- **Constraint:** Cannot modify question-bank data (tags, prerequisite IDs). Must work with the existing schema as-is.
- **Constraint:** The 7-mode FailureMode enum is API-frozen — adding/removing modes is out of scope.
- **Dependency:** Gemini 3.5 Flash Lite is the only available LLM for the student simulation; prompts must remain within its context window and output-format constraints.
- **Dependency:** isRetrievabilityLow helper is CANONICAL — must import, not reimplement or tweak.

## Acceptance Criteria (Rule type)

| ID | Rule | Evidence Source |
|---|---|---|
| AC1 | `tsc --noEmit` exits with code 0 | `npx tsc --noEmit` output |
| AC2 | `python -m py_compile run_eval.py student_agent.py` exits with code 0 | py_compile output |
| AC3 | 700-call V4 eval completes; Metric A (profile accuracy) ≥ 55% | accuracy_report.json V4 |
| AC4 | Metric B (option-tag match rate) ≥ 85% (no catastrophic regression) | accuracy_report.json V4 |
| AC5 | MODE_1_PREREQUISITE per-profile accuracy ≥ 45% | per_profile_breakdown in accuracy_report.json |
| AC6 | MODE_7_FORGETTING: of wrong answers with isRetrievabilityLow=true, at least 30% are predicted as MODE_7 | per-profile CM + filter by retrieval state |
| AC7 | Static blindness contract test (`assert_blindness_contract()`) prints `[OK]` and does not throw | startup log of run_eval.py |
| AC8 | No production-file TypeScript diagnostics in VS Code `GetDiagnostics` | GetDiagnostics tool output |

## Acceptance Criteria (Rubric type)

| ID | Dimension | Scale | Pass Threshold | Evidence Source |
|---|---|---|---|---|
| AC9 | Classifier architecture quality — evidence accumulation is a genuine replacement for hard priority, not a wrapper that still short-circuits | 0=hard rules unchanged; 1=score accumulation but still has early returns; 2=full score-accumulation with argmax across all signals, no early returns after correct-path | ≥ 1.5 | algorithm.ts code review + signal-contribution output shows >1 signal contributes to most decisions |
| AC10 | Profile prompt distinctiveness — each profile's strategy description contains cognitively specific behavioral markers that would lead to meaningfully different wrong-answer patterns (not just different time/switch counts) | 0=all prompts equivalent; 1=telemetry differs but content reasoning similar; 2=each profile has specific, unique cognitive instructions that produce content-distinctive wrong choices even on the same question | ≥ 1.5 | profiles.json + student_agent prompt review |
| AC11 | Eval telemetry richness — output enables root-cause diagnosis of remaining failures without re-running | 0=only headline %; 1=CM + per-profile acc; 2=per-mode P/R/F1, signal contribution histograms, engagement distributions | ≥ 1.5 | accuracy_report.json structure |
