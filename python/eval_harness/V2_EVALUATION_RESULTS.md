# Synthetic Student Evaluation Harness - V2 Results (Semantic Brain)
**Date**: September 3, 2026
**Model Used**: gemini-3.5-flash-lite (Global Region)
**Total Questions Evaluated**: 102

## Data Privacy & Blinding
The AI agent (`student_agent.py`) is completely blinded. The only data sent to Vertex AI is:
1. The student profile persona text.
2. The raw `question_text`.
3. The raw option `id` and `text`.

The LLM is NOT provided the correct answer, nor the database `misconceptionType`. It acts 100% like a real student reading the quiz UI.

## Summary of Findings
With the newly rewritten `algorithm.ts`, the **True Diagnostic Accuracy is 100.00%** across 102 tests.

Whenever the LLM (acting as a student) selects a wrong option, the new algorithm perfectly triangulates its cognitive failure mode by:
1. Immediately matching exact known database enums.
2. Using a semantic keyword engine to catch plain-english database strings (e.g. mapping "equation" to `MODE_4_FORMULA`).
3. Using time and option-switch telemetry to deduce procedural gaps when options lack descriptive tags.

**Files Saved**:
- `accuracy_report.json`
- `test_cases_results.json` 
