# Mastery Diagnostic V4 — Implementation Tasks

## Task 1: algorithm.ts V3 Bayesian Score Accumulation Classifier

**Priority:** HIGH
**Depends on:** (none)
**Acceptance Criterion mapping:** AC1, AC8, AC9

### Implementation Work

1. **Add `classifyFailureModeV3` interface:** same parameters as V2 + optional `signalContribution?: boolean` for telemetry.
2. **Implement Bayesian score accumulation:**
   - Initialize a zero score map for all 8 modes (M1..M7 + NONE).
   - **Correct path (Priority 0):** If `isCorrect`: fast-abs+fast-ratio+not-fast-learner → add large positive to MODE_6 and return. Else add large positive to NONE and return.
   - **Engagement factor:** `engagement = clamp(timeRatio / 0.5, 0, 1)` where `timeRatio = timeSpent / max(expected, 15)`.
   - **GUESSING signal (P1):** If `timeRatio < 0.2 AND timeSpent < 15`: add 2.0 to MODE_6, subtract 0.5 from all others (extreme — they didn't read).
   - **Option tag signal (P2):** Resolve tag. If found, add `(1.5 * engagement)` to that mode. If engagement < 0.2, SKIP option tag entirely (they didn't read it).
   - **Prerequisite elevation (P3):** If `prerequisiteTrapId` is non-empty on the selected option: add 1.0 to MODE_1 regardless of engagement (the designer linked it explicitly).
   - **Semantic keyword signal (P4):** Resolve from miscType. If found, add `(1.0 * engagement)` to that mode.
   - **Forgetting modulation (P5):** If `isRetrievabilityLow AND !isCorrect AND timeRatio >= 0.2` (not pure guessing): add 1.2 to MODE_7.
   - **Telemetry triangulation (P6):**
     - `timeRatio > 2.0 AND switches >= 3`: add 1.3 to MODE_3.
     - `timeRatio > 1.5 AND switches >= 2`: add 1.1 to MODE_3.
     - `switches >= 2 AND 0.5 <= timeRatio <= 2.0`: add 0.9 to MODE_4.
     - `timeRatio > 2.5`: add 0.7 to MODE_2.
     - `switches == 1`: add 0.5 to MODE_2.
     - `timeRatio in [0.2, 0.5] AND switches <= 1`: add 0.8 to MODE_5 (rushed, careless).
   - **Tiebreak:** In case of exact tie, priority order = M2 (conceptual, most conservative pedagogically) > M5 > M4 > M3 > M1 > M7 > M6 > NONE.
   - Return `argmax(scores)`.
3. **Retrofit `classifyFailureModeV2`** to call V3 internally (zero API breakage).
4. **Keep `classifyFailureMode()`** wrapper unchanged.

### Test Requirements (TR)

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T1-1 | rule | tsc --noEmit passes | build log |
| T1-2 | rule | classifyFailureModeV2 signature identical to V2 pre-change | diff of caller sites (submit.ts, evaluate.ts) compiles without edits |
| T1-3 | rubric | Score accumulation: no `return` statement except correct-path early return and final argmax | code inspection (algorithm.ts lines ~240-380) |

---

## Task 2: Python Port of V3 Classifier in run_eval.py

**Priority:** HIGH
**Depends on:** Task 1 (for parity validation)
**Acceptance Criterion mapping:** AC2, AC3, AC4, AC9

### Implementation Work

1. **Implement `classify_failure_mode_v3_py()`** — character-for-character port of algorithm.ts V3:
   - Correct-path check first.
   - Engagement factor identical formula.
   - Signal weights identical: guessing=2.0, option-tag=1.5\*engagement, prereq=1.0, semantic=1.0\*engagement, forgetting=1.2, telemetry weights as TS.
   - Tiebreak order identical.
2. **Update `classify_failure_mode_v2()`** to call V3 (backward compat alias).
3. **No other eval-loop changes in this task** — save Pillar 3/4 for Tasks 4 and 5.

### Test Requirements

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T2-1 | rule | `python -m py_compile run_eval.py` exits 0 | py_compile output |
| T2-2 | rule | For 20+ spot-checked random inputs, TS V3 output == Py V3 output | unit test or manual comparison script |

---

## Task 3: Pillar 2 — Structural Signal Fixes (Embedded in Tasks 1+2)

**Priority:** HIGH
**Depends on:** Tasks 1, 2
**Acceptance Criterion mapping:** AC5, AC6

This task's changes are **embedded in Task 1 (TS)** and **Task 2 (Py)**. Specific deliverables tracked here:

| # | Fix | TS Location | Py Location |
|---|---|---|---|
| 3a | prerequisiteTrapId elevation: +1.0 to M1 regardless of option tag (even if engagement is low) | V3 signal section, prereq branch | V3 signal section, prereq branch |
| 3b | MODE_7 wrong-answer boost: +1.2 to M7 when isRetrievabilityLow && !correct && timeRatio>=0.2 | V3 forgetting branch | V3 forgetting branch |
| 3c | Engagement gating: if engagement < 0.2 (timeRatio<0.2), SKIP option tag signal entirely | V3 option-tag branch, `if engagement < 0.2 skip` | V3 option-tag branch, same guard |

### Test Requirements

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T3-1 | rule | When option has prerequisiteTrapId AND misconceptionType=MODE_2_CONCEPTUAL AND timeRatio=1.0: classifier must pick MODE_1 over MODE_2 | spot test input with synthetic data |
| T3-2 | rule | When isRetrievabilityLow=true, !correct, miscType=MODE_4_FORMULA, timeRatio=1.0: classifier must pick MODE_7 over MODE_4 | spot test |
| T3-3 | rule | When miscType=MODE_2_CONCEPTUAL but timeRatio=0.1 (didn't read), switches=0: classifier must NOT pick MODE_2 (should pick MODE_6 or M5 fallback) | spot test |

---

## Task 4: Profile Prompt Hardening (profiles.json + student_agent.py)

**Priority:** HIGH
**Depends on:** (none)
**Acceptance Criterion mapping:** AC7, AC10

### Implementation Work

1. **profiles.json — rewrite each profile's description+strategy with cognitive markers:**
   - **MODE_6_GUESSING:** "You scan the question for 2-3 seconds, pick ANY option that catches your eye — do NOT solve, do NOT compare options. You get it right sometimes purely by chance. You don't care which misconceptionType tag the option has."
   - **MODE_5_CARELESS:** "You understand everything but you rush through steps. When doing math, you frequently make sign flips, decimal drops, unit swaps, order-of-operations errors. You OFTEN end up clicking an option that on the surface looks like a 'formula error' or 'conceptual error' to someone else — but the ROOT cause is just a rushed slip. Don't deliberately hunt for a 'careless-tagged' option; just commit the slip and pick whatever matches your wrong result, even if it's tagged something else."
   - **MODE_1_PREREQUISITE:** "You never properly learned foundational prerequisites (Class 9-11 algebra, trig identities, basic calculus rules). You confidently apply simpler, wrong methods. Your wrong answers OFTEN look like 'formula mistakes' or 'conceptual mistakes' to a surface-level reader — but the ROOT cause is that you never learned the prerequisite tool, so you're guessing at what foundation to build on. Pick the answer that matches your shaky foundation, regardless of what tag the option might have to someone else."
   - **MODE_7_FORGETTING:** "You mastered this 3+ months ago but haven't reviewed since. You start strong but then blank on a key detail — a formula term, a sign in a derivation, a boundary condition. Your wrong answers FREQUENTLY look like 'formula errors' or 'procedural slip-ups' or even 'conceptual confusion' on the surface — but the ROOT cause is specifically that you forgot what you once knew. Pick the near-right answer that a rusty former-expert would land on."
   - **MODE_3_PROCEDURAL:** "You understand the concepts cold. You can explain the physics/math to someone else. But executing multi-step problems reliably is hard for you. You skip steps, mess up substitution order, forget boundary conditions, spin your wheels re-trying different approaches. You FREQUENTLY make it to within one step of the right answer then mess up execution — landing on distractors that look like 'formula' or 'careless' slips. Pick the answer that results from a good plan executed badly, with many answer switches as you vacillate."
   - **MODE_4_FORMULA:** "You get the general approach. You set up the problem correctly. But when it comes time to plug numbers into the precise formula, you misremember it — sign flipped, reciprocal, constant off by 2x, term missing. You narrow to 2 options that differ only by the formula variant and pick the wrong one. This might SOMETIMES overlap with what looks like a 'conceptual' or 'prerequisite' gap to an outsider, but the ROOT cause is specifically a formula memory error, not a reasoning gap."
   - **MODE_2_CONCEPTUAL:** "You have a deep, confident, wrong mental model. You can argue eloquently for your wrong answer — you're not guessing, you're not rushing, you're not forgetting, you simply learned the principle incorrectly. You pick the answer that directly reflects your wrong intuition with zero hesitation and zero switches. You are SURE you're right. The option's tag (if you could see it) would probably match MODE_2 — that's typical for this profile."

2. **student_agent.py — rewrite the persona strategy block in the prompt:**
   - Remove the lines that instruct students to "deliberately introduce the careless slip and pick the matching distractor" (line 284-290 area). Replace with: "Be faithful to your persona's cognitive state. Wrong answers may land on any option; do NOT try to match a tag or label you cannot see."
   - Keep all blindness contract code UNCHANGED.
   - Keep pre-sampled telemetry override (it's ground truth for time/switches).

### Test Requirements

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T4-1 | rule | `python -m py_compile student_agent.py` exits 0 | py_compile |
| T4-2 | rule | `assert_blindness_contract()` passes unchanged | running the module standalone prints [OK] |
| T4-3 | rubric | Profile prompts produce cognitively distinct wrong-answer reasoning (visible in test_cases_results.json `llm_reasoning` field — each profile uses distinctive language) | manual review of 10 samples per profile |

---

## Task 5: Richer Eval Telemetry (run_eval.py)

**Priority:** MEDIUM
**Depends on:** Tasks 2, 4
**Acceptance Criterion mapping:** AC11

### Implementation Work

1. **Per-mode precision/recall/F1:**
   - From the profile_confusion_matrix, compute:
     - Precision(M) = CM[M][M] / sum_rows(CM[*][M])
     - Recall(M) = CM[M][M] / sum_cols(CM[M][*])
     - F1(M) = 2*P*R/(P+R)
   - Save to accuracy_report.json under `per_mode_prf1`.

2. **Signal contribution histogram:**
   - Instrument classify_failure_mode_v3_py to OPTIONALLY return the winning mode's score breakdown by signal source.
   - Aggregate: for each mode, what % of correct predictions came primarily from which signal.
   - Save under `signal_contribution_breakdown`.

3. **Engagement distribution per profile:**
   - Bin timeRatio into [0,0.2), [0.2,0.5), [0.5,1.0), [1.0,2.0), [2.0,inf).
   - For each profile, output the count in each bin.
   - Save under `engagement_distribution`.

4. **MODE_7 recall on wrong answers:**
   - Filter test_cases where ground_truth_profile=MODE_7_FORGETTING AND is_correct=false AND fsrs_simulation.is_retrievability_low=true.
   - Compute: fraction where predicted_classification=MODE_7_FORGETTING.
   - Save under `mode7_wrong_answer_recall`.

### Test Requirements

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T5-1 | rule | accuracy_report.json has all 4 new top-level keys: per_mode_prf1, signal_contribution_breakdown, engagement_distribution, mode7_wrong_answer_recall | JSON structure inspection |
| T5-2 | rule | per_mode_prf1 has 7 modes (excluding NONE) with P/R/F1 floats in [0,1] | JSON structure inspection |

---

## Task 6: TypeScript + Python Syntax Validation

**Priority:** HIGH
**Depends on:** Tasks 1–5 (completes all code changes)
**Acceptance Criterion mapping:** AC1, AC2, AC8

Must pass:
- `npx tsc --noEmit` (TypeScript build, exit 0)
- `python -m py_compile run_eval.py student_agent.py` (Python syntax, exit 0)
- VS Code `GetDiagnostics` has zero errors in production files

### Test Requirements

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T6-1 | rule | tsc exit code 0 | build log |
| T6-2 | rule | py_compile exit code 0 | py_compile output |
| T6-3 | rule | GetDiagnostics shows 0 errors | tool output |

---

## Task 7: V4 Evaluation Run (700 calls)

**Priority:** HIGH
**Depends on:** Task 6
**Acceptance Criterion mapping:** AC3, AC4, AC5, AC6

Run:
```
cd python/eval_harness && python run_eval.py
```
With num_questions=100, seed=42 (same as V3 for apples-to-apples). Verify all 3 output files are written.

### Test Requirements

| TR ID | Type | Condition | Evidence |
|---|---|---|---|
| T7-1 | rule | All 3 files written (V4_EVALUATION_RESULTS.md, accuracy_report.json, test_cases_results.json) with V4 label | ls + head of V4 md file |
| T7-2 | rule | total_evaluations == 700 (or close — no more than 10 lost to LLM failures) | accuracy_report.json |

---

## Task 8: Independent Review — V3→V4 Delta Analysis

**Priority:** HIGH
**Depends on:** Task 7
**Acceptance Criterion mapping:** (all ACs)

Checklist:
1. Compare Metric A V3=41% vs V4: must be ≥ 55%.
2. Compare Metric B V3=92.5% vs V4: must be ≥ 85%.
3. Per-profile: MODE_1 must be ≥ 45%, all error profiles ≥ 50% weighted average.
4. MODE_7 wrong-answer recall: must be ≥ 30%.
5. No significant new TypeScript or Python errors.
6. Review signal contribution: engagement gating must actually fire for MODE_6/MODE_5 (option tag skipped in 15-25% of low-engagement cases).

If any check fails, return to Implement phase with specific remediation items in tasks.md.
