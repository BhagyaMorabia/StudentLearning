# Implementation Tasks — NeuralJEE Eval Pipeline Completion

## Task 1: C4 — Mermaid 3-layered CSS safety belt (globals.css)
**Priority**: high  
**Depends On**: —  
**Status**: pending

### Change Scope
Edit `src/app/globals.css` — MERMAID block (~lines 247-261). Replace the 2-rule block with a 4-layered hardened version containing:
- Layer 0: `color-scheme: normal` on `.mermaid svg`
- Layer 1: Forced `fill: #e5e7eb !important` on all text selectors incl. `foreignObject` and `span`/`p` inside SVG
- Layer 2: Node rect/polygon background fill + border contrast so even if text disappears the shape is visible
- Layer 3: Shadow DOM / :is() fallback selectors

### TRs (Task-local Test Requirements)
- **Rule TR-1.1**: `grep globals.css "color-scheme: normal"` returns 1+ match inside mermaid section
- **Rule TR-1.2**: Text selectors `svg text, svg tspan, foreignObject *` all have `!important` fill
- **Rule TR-1.3**: Node shapes have explicit stroke+fill override not relying on Mermaid defaults

---

## Task 2: cp1252-safe ASCII glyph replacement in Python files
**Priority**: high  
**Depends On**: —  
**Status**: pending

### Change Scope
- `python/eval_harness/run_eval.py` lines 516-517: replace `'✓'` with `'[OK]'` and `'✗'` with `'[NO]'` / `'[--]'` for None
- `python/eval_harness/student_agent.py`: grep for any unicode glyphs, replace with ASCII

### TRs
- **Rule TR-2.1**: grep for `[✓✗✘✔★☆]` in both Python files returns 0 matches
- **Rule TR-2.2**: Line 516-517 replacement produces valid Python syntax (py_compile)

---

## Task 3: Remove dead for-loop in `_classify_from_misconception_tag`
**Priority**: high  
**Depends On**: —  
**Status**: pending

### Change Scope
`run_eval.py` function `_classify_from_misconception_tag`:
- Delete lines 71-76 (the first broken index-math for-loop with empty body `pass`; the second suffix_map dict is correct)
- Keep lines 77-92 (the explicit suffix_map) as the single canonical path

### TRs
- **Rule TR-3.1**: Function body has exactly ONE for-loop (over suffix_map), not two
- **Rule TR-3.2**: `classify_failure_mode_v2(False, 60, 60, 0, 'MODE_4_FORMULA', None)` still returns `'MODE_4_FORMULA'` (smoke test via inline python)

---

## Task 4: TypeScript Build Validation
**Priority**: high  
**Depends On**: Task 1 (because globals.css is in the TS compilation via Next.js)  
**Status**: pending

### Change Scope
Run `npx tsc --noEmit` from repo root. Fix any type errors.

### TRs
- **Rule TR-4.1**: Exit code 0
- **Rule TR-4.2**: 0 errors emitted to stderr

---

## Task 5: Python Syntax Validation
**Priority**: high  
**Depends On**: Tasks 2, 3  
**Status**: pending

### Change Scope
Run `python -m py_compile run_eval.py student_agent.py` from `python/eval_harness` dir.

### TRs
- **Rule TR-5.1**: Exit code 0
- **Rule TR-5.2**: No `__pycache__` compile error messages in stderr

---

## Task 6: Run 700-call Evaluation (100 questions × 7 profiles)
**Priority**: high  
**Depends On**: Tasks 1, 2, 3, 4, 5  
**Status**: pending

### Change Scope
Execute `cd python/eval_harness && python run_eval.py` with 100 random questions, seed 42.

### TRs
- **Rule TR-6.1**: Startup blindness contract prints `[OK] Student-agent blindness contract verified`
- **Rule TR-6.2**: Final report lines printed: `(A) Profile diagnostic acc` and `(B) Option-tag match rate` with `(correct/total)` denominators
- **Rule TR-6.3**: Files `accuracy_report.json`, `test_cases_results.json`, `V3_EVALUATION_RESULTS.md` exist after run
- **Rubric TR-6.4**: Metric A ≥ 40% and Metric B ≥ 70% are realistic baselines (no threshold but must be reported)

---

## Task 7: Priority-Order Evidence (Classifier, Blindness, MODE_7)
**Priority**: medium  
**Depends On**: — (can run in parallel with Tasks 1-5)  
**Status**: pending

### Change Scope
No code changes. Read and record:
- algorithm.ts classifyFailureModeV2 priority order (Priority 0 → 6)
- student_agent 3-layer enforcement: strip (L71-89) + regex+keyword verify (L92-133) + static assert (L135-180)
- profiles.json MODE_7 entry + simulate_fsrs_state + API route isRetrievabilityLow imports

### TRs
- **Rule TR-7.1**: Document that misconceptionType is Priority 2 (after Guessing P0/P1, before prerequisiteTrapId P3)
- **Rule TR-7.2**: Document that BOTH `/api/quiz/submit` and `/api/quiz/evaluate` import `isRetrievabilityLow` from `algorithm.ts`
- **Rule TR-7.3**: Document `student_forgetting` profile exists in profiles.json with MODE_7_FORGETTING ground truth
