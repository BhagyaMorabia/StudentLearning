#!/usr/bin/env python3
"""
01_pdf_to_markdown.py — Convert JEE textbook PDFs to clean Markdown.

Uses Marker (https://github.com/VikParuchuri/marker) which:
- Handles LaTeX formulas correctly (outputs $$...$$ syntax)
- Preserves table structure
- Orders content correctly (handles multi-column layouts)
- Is free and runs locally (no API key needed)

Input:  python/data/input_pdfs/*.pdf
Output: python/data/markdown_output/<book_name>.md

Usage:
    python 01_pdf_to_markdown.py
    python 01_pdf_to_markdown.py --pdf path/to/specific.pdf
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

INPUT_DIR = Path(__file__).parent.parent / "data" / "input_pdfs"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "markdown_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def convert_pdf(pdf_path: Path) -> Path:
    """Convert a single PDF to Markdown using Marker."""
    output_path = OUTPUT_DIR / (pdf_path.stem + ".md")

    if output_path.exists():
        print(f"  [OK] Already converted: {output_path.name}")
        return output_path

    print(f"  Converting: {pdf_path.name} -> {output_path.name}")

    try:
        import pymupdf4llm

        print("  Converting with PyMuPDF4LLM...")
        full_text = pymupdf4llm.to_markdown(str(pdf_path))

        # Write markdown output
        output_path.write_text(full_text, encoding="utf-8")

        print(f"  [OK] Converted: {len(full_text):,} characters")
        return output_path

    except ImportError:
        print("ERROR: pymupdf4llm not installed.")
        print("Run: pip install pymupdf4llm")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Conversion failed: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Convert JEE PDFs to Markdown")
    parser.add_argument("--pdf", type=str, help="Path to specific PDF (default: all in input_pdfs/)")
    args = parser.parse_args()

    if args.pdf:
        pdf_files = [Path(args.pdf)]
    else:
        pdf_files = list(INPUT_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"No PDFs found in {INPUT_DIR}")
        print(f"Drop your NCERT/NTA PDFs into: {INPUT_DIR}")
        return

    print(f"Found {len(pdf_files)} PDF(s) to convert")
    for pdf in pdf_files:
        convert_pdf(pdf)

    print(f"\n[OK] Done. Markdown files in: {OUTPUT_DIR}")
    print("Next step: python 02_extract_concepts.py")


if __name__ == "__main__":
    main()
