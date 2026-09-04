# NeuralJEE Evaluation Pipeline Completion — Spec

## Problem
The evaluation pipeline (algorithm.ts V2 classifier × Python eval harness) is **structurally complete** but has several **production-safety gaps** that will cause silent failures or misleading results on Windows:
- C4: Mermaid SVG text is invisible on dark themes (rendered before CSS theme vars cascade)
- Unicode checkmark/cross glyphs crash `cp1252` stdout on Windows terminals
- Dead/buggy code in `_classify_from_misconception_tag` (empty for-loop with index-math that's never executed)
- Before running 700 LLM calls (7 profiles × 100 questions), all safety guards must pass

Additionally, the user requires confirmation that:
1. `option.misconceptionType` is used as the **PRIMARY** classifier signal (not fallback) — verified against algorithm.ts V2
2. The student-actor LLM is **truly blind** (no correct-answer flags, no misconceptionType leakage, runtime-enforced)
3. MODE_7_FORGETTING profile is present and FSRS-retrievability semantics are unified across API routes

## Users / Goals
| Stakeholder | Goal |
|---|---|
| Pedagogy Engineer | Honest profile-diagnostic accuracy (Metric A), not inflated 3-way-OR numbers |
| ML Engineer | Reproducible 700-call eval on Windows without cp1252 crashes |
| Frontend Engineer | Mermaid diagrams visible on dark theme in all browsers |
| Security / Safety | Blindness contract is enforced at runtime, not just documented |

## Non-Goals
- Not rewriting algorithm.ts logic (already correct V2 human-brain priority)
- Not changing FSRS math in spaced-rep.ts
- Not modifying question DB schema or option tag format
- Not adding new profile types beyond existing 7

## Functional Requirements
### FR-1 — Mermaid Invisible Text (C4, globals.css)
Three-layered CSS safety belt:
1. **Layer 0**: `color-scheme: normal` on `.mermaid svg` to prevent OS-level dark-theme from inverting SVG fills
2. **Layer 1**: Forced fill on every text selectors (`svg text`, `svg tspan`, `foreignObject *`) with explicit `#e5e7eb` light gray AND fallbacks for KaTeX/MathJax inside diagrams
3. **Layer 2**: Background pill on `.node` text rects so text is legible even if fill cascade fails
4. **Layer 3**: `!important` on ALL mermaid text rules, plus `::ng-deep` / `:is()` wrappers for Shadow DOM

### FR-2 — cp1252-Safe I/O (run_eval.py + student_agent.py)
- Every unicode glyph `✓ ✗ ✘ ✔ ★ ☆` → ASCII-safe `[OK] / [NO] / [?]` or plain ASCII chars
- Confirm both files have 0 occurrences of problematic code-points via grep

### FR-3 — Dead Code Removal in run_eval.py
- Lines 71-75 in `_classify_from_misconception_tag`: empty for-loop with `pass` body → delete
- Keep the explicit `suffix_map` dict (lines 77-85) as the canonical path; it is correct

### FR-4 — Classifier Priority Contract (Verified by Evidence)
Evidence (not code change) that `classifyFailureModeV2` in algorithm.ts:
1. Calls `classifyFromMisconceptionTag()` at **Priority 2** (only after Guessing-fast-path), BEFORE prerequisiteTrapId (P3) and BEFORE semantic keywords (P4) and BEFORE retrievability (P5) and BEFORE telemetry (P6)
2. Priority ordering documented inline passes visual inspection

### FR-5 — Blindness Contract (Verified by Evidence)
- Static smoke test (`assert_blindness_contract`) catches malicious rigged prompt (already exists)
- `_strip_options_for_prompt` whitelist is exactly `{id, text}` (no extra fields)
- `_verify_prompt_blindness` cross-check: non-id/non-text option values of length ≥ 4 chars trigger an exception

### FR-6 — MODE_7 Profile & FSRS Semantics (Verified by Evidence)
- profiles.json contains `student_forgetting` with ground_truth_mode `MODE_7_FORGETTING`
- `simulate_fsrs_state('MODE_7_FORGETTING')` produces a state where `isRetrievabilityLow_py()` returns True (last_review=90d ago, due=83d overdue, lapses=2, R=0.25)
- BOTH API routes (`submit` and `evaluate`) call the canonical `isRetrievabilityLow()` from algorithm.ts

### FR-7 — Build & Syntax Validation
- TypeScript: `npx tsc --noEmit` returns exit code 0
- Python: `python -m py_compile run_eval.py student_agent.py` returns exit code 0

### FR-8 — End-to-End Evaluation Run
- Execute 100 random DB questions × 7 profiles = 700 total student simulations
- Report Metric A (Profile Diagnostic Accuracy) AND Metric B (Option-Tag Match Rate) separately
- Persist `accuracy_report.json`, `test_cases_results.json`, `V3_EVALUATION_RESULTS.md`

## Non-Functional Requirements
- **No overfitting**: Questions are `ORDER BY RANDOM()` with seed 42 (reproducible but uniform)
- **No prompt leakage**: Runtime blindness check runs on every LLM call; violations → refuse call + fall back to random
- **ASCII-only stdout**: No character outside code-point range 0x20–0x7E in Python `print()` calls
- **Rate limiting**: Exponential backoff on 429 (2, 4, 8, 16s) up to 4 retries/call

## Constraints & Dependencies
- DATABASE_URL must be valid Postgres (verifiable at eval-startup)
- Vertex AI project + location must be initialized via `.env.local` (already in `python/eval_harness/.env.local` → `../../.env.local`)
- gemini-3.5-flash-lite quota sufficient for 700 calls with 4 retries each = ~2,800 budget

## Open Questions
None. All design decisions locked by V2 algorithm.

## Acceptance Criteria
### Rules (Pass / Fail)
| ID | Rule | Evidence |
|---|---|---|
| AC-R1 | `globals.css` mermaid section has all 3 layers + color-scheme: normal | `Grep globals.css for "mermaid"` output |
| AC-R2 | Zero ✓/✗/✘/✔/★/☆ unicode glyphs in run_eval.py / student_agent.py | `Grep output for unicode chars` |
| AC-R3 | `_classify_from_misconception_tag` has no empty dead-code for-loop | Line-count diff for that function |
| AC-R4 | `npx tsc --noEmit` exit 0 | Terminal output |
| AC-R5 | `py_compile` on both Python files exit 0 | Terminal output |
| AC-R6 | Eval completes and writes all 3 artifacts (accuracy_report.json, test_cases_results.json, V3_EVALUATION_RESULTS.md) | File existence check |
| AC-R7 | Blindness static smoke-test passes at eval startup | `[OK] Student-agent blindness contract verified` line in stdout |
| AC-R8 | Both report metrics A and B are printed with denominators | stdout final-report lines |

### Rubrics (Scored)
| ID | Dimension | Scale | Pass Threshold | Evidence Source |
|---|---|---|---|---|
| AC-U1 | Algorithm priority fidelity (misconceptionType is PRIMARY, not fallback) | 0–2 | ≥ 2 | algorithm.ts classifyFailureModeV2 priority order read |
| AC-U2 | cp1252 safety (0 unicode glyph crashes / replacement chars used) | 0–2 | ≥ 2 | grep + run start stdout first 20 lines |
| AC-U3 | Mermaid CSS robustness (layers 0–3 all present) | 0–2 | ≥ 2 | globals.css mermaid block read |
| AC-U4 | Blindness defence in depth (3 layers active: strip + keyword regex + option-value cross-check) | 0–2 | ≥ 2 | student_agent.py lines 71-133 code review |
