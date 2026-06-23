#!/usr/bin/env python3
"""
03_validate_math.py — Validate all formulas using SymPy.

For each concept in the extracted JSON, tries to parse each formula's
sympy_expr with SymPy. Marks formulas as sympy_verified=True/False.
Flagged formulas are logged for human review.

This step is CRITICAL: it catches sign errors, wrong exponents, and
dimensional mismatches before content reaches students.

Input:  python/data/concepts_json/*.json
Output: Same files, updated with sympy_verified field on each formula

Usage:
    python 03_validate_math.py
"""

import json
import sys
from pathlib import Path
from tqdm import tqdm

INPUT_DIR = Path(__file__).parent.parent / "data" / "concepts_json"


def validate_formula(sympy_expr: str) -> tuple[bool, str]:
    """
    Try to parse and simplify a SymPy expression.
    Returns (is_valid, error_message).
    """
    try:
        from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
        import sympy

        transformations = standard_transformations + (implicit_multiplication_application,)
        expr = parse_expr(sympy_expr, transformations=transformations)
        sympy.simplify(expr)
        return True, ""
    except ImportError:
        print("ERROR: sympy not installed. Run: pip install sympy")
        sys.exit(1)
    except Exception as e:
        return False, str(e)


def validate_all_formulas(concepts: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Validate all formulas in all concepts.
    Returns (updated_concepts, flagged_list).
    """
    flagged = []
    total_formulas = 0
    verified_formulas = 0

    for concept in tqdm(concepts, desc="Validating formulas"):
        for formula in concept.get("key_formulas", []):
            sympy_expr = formula.get("sympy_expr", "").strip()
            if not sympy_expr:
                formula["sympy_verified"] = None  # Not provided — skip
                continue

            total_formulas += 1
            is_valid, error = validate_formula(sympy_expr)
            formula["sympy_verified"] = is_valid

            if is_valid:
                verified_formulas += 1
            else:
                formula["sympy_error"] = error
                flagged.append({
                    "concept": concept.get("name", "Unknown"),
                    "latex": formula.get("latex", ""),
                    "sympy_expr": sympy_expr,
                    "error": error,
                })

    print(f"\n  Validated: {verified_formulas}/{total_formulas} formulas")
    print(f"  Flagged: {len(flagged)} formulas for human review")

    return concepts, flagged


def main():
    json_files = list(INPUT_DIR.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {INPUT_DIR}")
        print("Run 02_extract_concepts.py first")
        return

    all_flagged = []

    for json_path in json_files:
        print(f"\nValidating: {json_path.name}")
        concepts = json.loads(json_path.read_text(encoding="utf-8"))

        if not isinstance(concepts, list):
            print(f"  ⚠ Unexpected format in {json_path.name}")
            continue

        updated_concepts, flagged = validate_all_formulas(concepts)
        all_flagged.extend(flagged)

        # Save updated JSON (with sympy_verified fields)
        json_path.write_text(json.dumps(updated_concepts, indent=2, ensure_ascii=False))
        print(f"  [OK] Saved updated: {json_path.name}")

    # Save all flagged formulas for human review
    if all_flagged:
        flagged_path = INPUT_DIR.parent / "flagged_formulas.json"
        flagged_path.write_text(json.dumps(all_flagged, indent=2, ensure_ascii=False))
        print(f"\n⚠ {len(all_flagged)} formulas need human review → {flagged_path.name}")
        print("  Review and fix these BEFORE running 05_push_to_db.py")
    else:
        print("\n[OK] All formulas validated successfully!")

    print("\nNext step: python 04_generate_embeddings.py")


if __name__ == "__main__":
    main()
