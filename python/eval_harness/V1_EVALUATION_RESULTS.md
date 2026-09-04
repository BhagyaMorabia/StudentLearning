# Synthetic Student Evaluation Harness - V1 Results
**Date**: September 3, 2026
**Model Used**: gemini-3.5-flash-lite (Global Region)
**Total Questions Evaluated**: 60

## Files Included in this Directory
1. `accuracy_report.json`: Contains the high-level diagnostic accuracy (28.33%) and the confusion matrix showing exactly which failure modes the algorithm correctly predicted.
2. `test_cases_results.json`: A deeply granular JSON file containing all 60 test cases. For every single test, this file includes:
   - The question text and available options
   - The ground truth student profile
   - The AI's exact reasoning for why it chose the wrong answer
   - The option it selected vs the correct option
   - The simulated telemetry (time spent and option switches)
   - The final prediction from the algorithm vs the ground truth.

## Summary of Findings
The Mastery Algorithm (`classifyFailureMode`) currently suffers from low accuracy (28%) because it relies on strict word matching (e.g., looking for the exact word "calculation") while the actual database options contain a mix of enum strings (e.g., `MODE_5_CARELESS`) and varied semantic phrases (e.g., `Sign Convention Error`). 

**Next Steps**: Rewrite the algorithm to check for exact enum matches, use broader semantic keyword matching, and fall back to telemetry when the option's misconception tag is too generic.
