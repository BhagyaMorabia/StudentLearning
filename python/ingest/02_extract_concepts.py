#!/usr/bin/env python3
"""
02_extract_concepts.py — Extract JEE concepts from Markdown using Gemini Flash.

Takes Markdown output from 01_pdf_to_markdown.py and extracts:
- Concept names and descriptions
- Key formulas (LaTeX + SymPy-parseable form)
- Prerequisites
- Common mistakes
- JEE frequency

Uses Gemini Flash (free tier: 15 RPM, 1M tokens/day) for extraction.
Gemini is ONLY used here in the Python pipeline, NOT in the Next.js app.
The Next.js app uses Claude exclusively.

Input:  python/data/markdown_output/*.md
Output: python/data/concepts_json/<book_name>.json

Usage:
    python 02_extract_concepts.py
    python 02_extract_concepts.py --file physics_part1.md
"""

import os
import sys
import json
import time
import argparse
import hashlib
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

INPUT_DIR = Path(__file__).parent.parent / "data" / "markdown_output"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "concepts_json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not set in .env")
    sys.exit(1)

EXTRACTION_PROMPT = """
You are an expert JEE curriculum designer with 20 years of experience.
Read the following textbook content and extract a JSON array of MicroConcepts.

For EACH MicroConcept, output EXACTLY this structure:
{
  "name": "Exact concept name (e.g., 'Magnetic Field of a Toroid')",
  "description": "2-3 sentences suitable for JEE students. Include the key idea.",
  "key_formulas": [
    {
      "latex": "$$B = \\\\mu_0 n I$$",
      "sympy_expr": "B = mu_0 * n * I",
      "description": "Magnetic field inside a toroid"
    }
  ],
  "common_mistakes": [
    "Confusing toroid with solenoid — toroid has circular path, not linear"
  ],
  "prerequisites": ["Ampere's Law", "Magnetic Flux"],
  "jee_frequency": 3,
  "estimated_minutes": 15
}

RULES:
- Extract ONLY genuinely testable JEE concepts (not historical notes, not worked examples)  
- sympy_expr must be parseable by SymPy: use Python syntax (**, *, no implicit multiplication)
- latex must be valid LaTeX wrapped in $$...$$
- prerequisites must reference OTHER concept names that WOULD appear in your extraction
- jee_frequency: 1=rare, 2=occasional, 3=common, 4=frequent, 5=almost certain
- Return ONLY a valid JSON array. No prose. No markdown code blocks. No explanation.

CONTENT:
{content}
"""


def chunk_text(text: str, max_chars: int = 8000) -> list[str]:
    """Split text into chunks that fit in Gemini's context."""
    # Split on double newlines (paragraph boundaries)
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = []
    current_length = 0

    for para in paragraphs:
        if current_length + len(para) > max_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [para]
            current_length = len(para)
        else:
            current_chunk.append(para)
            current_length += len(para)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks


def deduplicate_concepts(concepts: list[dict]) -> list[dict]:
    """Remove duplicate concepts by name (case-insensitive)."""
    seen = set()
    unique = []
    for concept in concepts:
        key = concept.get("name", "").lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(concept)
    return unique


def extract_concepts(markdown_text: str, source_name: str) -> list[dict]:
    """Extract concepts from markdown text using Gemini Flash."""
    try:
        import google.generativeai as genai
    except ImportError:
        print("ERROR: google-generativeai not installed")
        sys.exit(1)

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-flash-latest")

    chunks = chunk_text(markdown_text)
    all_concepts = []
    review_needed = []

    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i+1}/{len(chunks)} ({len(chunk):,} chars)...")

        max_retries = 5
        base_delay = 5
        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    EXTRACTION_PROMPT.replace("{content}", chunk)
                )
                raw = response.text.strip()

                # Strip markdown code blocks if Gemini wraps in ```json
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]

                concepts = json.loads(raw)
                if isinstance(concepts, list):
                    all_concepts.extend(concepts)
                    print(f"    [OK] Extracted {len(concepts)} concepts")
                else:
                    print(f"    [!] Unexpected response type: {type(concepts)}")
                
                break # Success, break out of retry loop

            except json.JSONDecodeError as e:
                print(f"    [!] JSON parse error: {e}")
                review_needed.append({
                    "source": source_name,
                    "chunk": i + 1,
                    "error": str(e),
                    "raw": response.text[:500] if "response" in dir() else "no response",
                })
                break # Don't retry on JSON errors, move to next chunk
            except Exception as e:
                import traceback
                traceback.print_exc()
                error_str = str(e)
                
                # 1. Catch the Rate Limit FIRST and force a 65-second sleep
                if "429" in error_str or "quota" in error_str.lower() or "exhausted" in error_str.lower():
                    print("    [!] API Minute Limit Hit! Sleeping for 65 seconds to safely reset quota...")
                    time.sleep(65)
                    continue # Try the exact same chunk again!
                
                # 2. Keep existing backoff logic for 503 or other random network errors
                print(f"    [!] API error: {error_str}")
                if "503" in error_str:
                    if attempt < max_retries - 1:
                        sleep_time = base_delay * (2 ** attempt)
                        print(f"      Server error. Retrying in {sleep_time} seconds (attempt {attempt+1}/{max_retries})...")
                        time.sleep(sleep_time)
                        continue
                
                # If not a retriable error or max retries reached
                print(f"    [!] Max retries reached or unrecoverable error.")
                review_needed.append({"source": source_name, "chunk": i + 1, "error": error_str})
                break

        # Respect Gemini free tier: 15 RPM → sleep 5 seconds between calls just to be safe
        if i < len(chunks) - 1:
            time.sleep(5)

    # Log review-needed items
    if review_needed:
        review_path = OUTPUT_DIR.parent / "review_needed.json"
        existing = []
        if review_path.exists():
            try:
                existing = json.loads(review_path.read_text())
            except Exception:
                pass
        review_path.write_text(json.dumps(existing + review_needed, indent=2))
        print(f"  [!] {len(review_needed)} chunks flagged for review -> review_needed.json")

    return deduplicate_concepts(all_concepts)


def main():
    parser = argparse.ArgumentParser(description="Extract JEE concepts from Markdown")
    parser.add_argument("--file", type=str, help="Specific markdown file name")
    args = parser.parse_args()

    if args.file:
        md_files = [INPUT_DIR / args.file]
    else:
        md_files = list(INPUT_DIR.glob("*.md"))

    if not md_files:
        print(f"No markdown files found in {INPUT_DIR}")
        print("Run 01_pdf_to_markdown.py first")
        return

    for md_path in md_files:
        if not md_path.exists():
            print(f"File not found: {md_path}")
            continue

        output_path = OUTPUT_DIR / (md_path.stem + ".json")
        if output_path.exists():
            print(f"Already extracted: {output_path.name} (delete to re-extract)")
            continue

        print(f"\nExtracting concepts from: {md_path.name}")
        text = md_path.read_text(encoding="utf-8")
        concepts = extract_concepts(text, md_path.stem)

        output_path.write_text(json.dumps(concepts, indent=2, ensure_ascii=False))
        print(f"[OK] Saved {len(concepts)} concepts → {output_path.name}")

    print("\nNext step: python 03_validate_math.py")


if __name__ == "__main__":
    main()
