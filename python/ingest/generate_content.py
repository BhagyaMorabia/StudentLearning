#!/usr/bin/env python3
"""
generate_content.py — Generate complete JEE teaching content using Gemini 3.1 Pro.

For every subtopic in jee_syllabus.py, this script calls the Gemini API to generate:
  - description: 3-5 sentence concept summary
  - raw_content: Full 2000-4000 word teaching material with LaTeX, Mermaid flowcharts
  - key_formulas: [{latex, sympy_expr, description}]
  - common_mistakes: List of frequent student errors
  - question_type_analysis: How JEE tests this subtopic

Saves progress per-chapter to python/data/concepts_json/<subject>_<chapter>.json.
Supports resuming — skips chapters that already have output files and subtopics that passed validation.

Usage:
    python generate_content.py                    # Full run
    python generate_content.py --subject Physics  # Only Physics
    python generate_content.py --resume           # Skip completed chapters
"""

import os
import sys
import json
import time
import argparse
import subprocess
import shutil
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

# Load .env.local from project root
ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

from jee_syllabus import SYLLABUS

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "concepts_json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CHECKPOINT_FILE = OUTPUT_DIR.parent / "generation_checkpoint.json"

# ── Gemini Configuration (Vertex AI — uses Google Cloud free credits) ─────────
# Authentication: uses gcloud Application Default Credentials (ADC).
# Run `gcloud auth application-default login` once to set up.
VERTEX_PROJECT = os.getenv("VERTEX_PROJECT", "student-501106")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")

MODEL = "gemini-3.1-pro-preview"

# Rate limiting
REQUESTS_PER_MINUTE = 15   
REQUEST_DELAY = 60 / REQUESTS_PER_MINUTE


# ── Pydantic Schema ──────────────────────────────────────────────────────────
class KeyFormula(BaseModel):
    latex: str = Field(description="Formula in valid LaTeX syntax")
    sympy_expr: str = Field(description="Formula in valid Python/Sympy syntax")
    description: str = Field(description="What this formula represents and when to use it")

class ConceptContent(BaseModel):
    name: str
    description: str = Field(description="3-5 sentence concept summary. What this is, why it matters for JEE.")
    raw_content: str = Field(description="FULL teaching content (2000-4000 words). Must include Mermaid flowcharts and LaTeX math.")
    key_formulas: list[KeyFormula]
    common_mistakes: list[str] = Field(description="Frequent student errors")
    jee_frequency: int = Field(description="Frequency of this concept in JEE (1-5)")
    estimated_minutes: int = Field(description="Estimated time to learn in minutes")
    question_type_analysis: str = Field(description="How JEE tests this subtopic")


# ── Prompts ───────────────────────────────────────────────────────────────────
CONTENT_GENERATION_PROMPT = """You are an elite JEE Physics/Chemistry/Mathematics educator with 20 years of experience coaching students to IIT ranks under 500.

Generate COMPREHENSIVE teaching content for the following subtopic. This content will be the PRIMARY knowledge source that an AI tutor uses to teach students — it must be thorough, rigorous, and exam-focused.

SUBTOPIC: {subtopic_name}
SUBJECT: {subject}
CHAPTER: {chapter}
TOPIC: {topic}
JEE FREQUENCY: {jee_freq}/5 (how often this appears in JEE exams)
TYPICAL QUESTION TYPES: {q_types}
TYPICAL JEE PATTERNS: {patterns}

Structure raw_content as:
## Conceptual Foundation
Start from first principles. Build intuition with physical/chemical/mathematical reasoning. Use analogies.

## Mathematical Framework
All relevant formulas in LaTeX (use $...$ for inline, $$...$$ for display). Show complete derivations where important.

## Problem-Solving Flowchart
Include a Mermaid.js flowchart that helps students decide which approach to use:
```mermaid
flowchart TD
  A[Read Problem] --> B{{What is given?}}
  B --> C[Approach 1]
  B --> D[Approach 2]
```

## Worked Examples
2-3 JEE-level worked examples with step-by-step solutions in LaTeX.

## JEE-Specific Strategies
Shortcuts, tricks, common traps. How JEE specifically tests this concept.

## Edge Cases and Special Conditions
Boundary conditions, limiting cases, where formulas break down.

## Quick Revision Points
Bullet-point summary of everything to remember.

CRITICAL RULES:
1. raw_content MUST be substantial. This is the student's PRIMARY learning resource.
2. ALL math must use valid KaTeX. Use \\frac{{}}{{}} not \\frac a b. DO NOT use math symbols like \\mu inside \\text{{}} blocks.
3. Include at least ONE valid Mermaid.js flowchart. Do not use unescaped special characters in node labels.
4. sympy_expr must be valid Python: use ** for power, * for multiplication.
5. Worked examples must have SPECIFIC numbers, not just variables.
"""


def check_node_environment():
    """Ensure node is in PATH and packages are installed."""
    if not shutil.which("node"):
        print("ERROR: Node.js is not in PATH. Please install Node.js.")
        sys.exit(1)
        
    script_dir = Path(__file__).parent
    node_modules = script_dir / "node_modules"
    
    if not node_modules.exists():
        print("ERROR: python/ingest/node_modules not found.")
        print("Please run 'npm install' in python/ingest/ first.")
        sys.exit(1)


def validate_content(raw_content: str) -> tuple[bool, list[str]]:
    """Calls validate_content.js to verify KaTeX and Mermaid."""
    script_path = Path(__file__).parent / "validate_content.js"
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"content": raw_content}, f)
        temp_path = f.name
        
    try:
        result = subprocess.run(
            ["node", str(script_path), temp_path],
            capture_output=True,
            text=True
        )
        
        try:
            output = json.loads(result.stdout)
            return output.get("valid", False), output.get("errors", [])
        except json.JSONDecodeError:
            return False, ["Validation script failed to return valid JSON"]
            
    finally:
        os.remove(temp_path)


def get_gemini_client():
    try:
        from google import genai
        client = genai.Client(
            vertexai=True,
            project=VERTEX_PROJECT,
            location=VERTEX_LOCATION,
        )
        print(f"[OK] Using Vertex AI (project={VERTEX_PROJECT}, location={VERTEX_LOCATION})")
        print(f"[OK] Billing goes through Google Cloud free credits")
        return client
    except ImportError:
        print("ERROR: google-genai not installed. Run: pip install google-genai")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Vertex AI auth failed: {e}")
        print("Run: gcloud auth application-default login")
        print("Then: gcloud config set project student-501106")
        sys.exit(1)


def generate_subtopic_content(client, subtopic: dict, subject: str, chapter: str, topic: str) -> dict:
    from google.genai import types
    
    prompt = CONTENT_GENERATION_PROMPT.format(
        subtopic_name=subtopic["name"],
        subject=subject,
        chapter=chapter,
        topic=topic,
        jee_freq=subtopic["jee_freq"],
        q_types=", ".join(subtopic["q_types"]),
        patterns="; ".join(subtopic["patterns"]) if subtopic["patterns"] else "General problems",
    )

    max_validation_retries = 3   # Content/validation failures
    max_rate_limit_retries = 10  # Rate limit backoffs (don't count against validation retries)
    base_delay = 5
    
    current_prompt = prompt
    validation_attempt = 0
    rate_limit_hits = 0

    while validation_attempt < max_validation_retries:
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=current_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ConceptContent,
                    temperature=0.3,
                ),
            )
            
            data = json.loads(response.text.strip())
            
            # Validate KaTeX and Mermaid
            is_valid, errors = validate_content(data.get("raw_content", ""))
            
            if is_valid:
                data["_validation_passed"] = True
                data["_retry_count"] = validation_attempt
                data["_validation_errors"] = []
                data["prerequisites"] = subtopic.get("prerequisites", [])
                return data
                
            else:
                validation_attempt += 1
                print(f"      [!] Validation failed on attempt {validation_attempt}: {errors[0][:100]}...")
                if validation_attempt < max_validation_retries:
                    current_prompt = prompt + f"\n\nYOUR PREVIOUS RESPONSE FAILED VALIDATION:\n{json.dumps(errors)}\nFix the syntax errors."
                    time.sleep(base_delay)
                    continue
                else:
                    data["_validation_passed"] = False
                    data["_retry_count"] = validation_attempt
                    data["_validation_errors"] = errors
                    data["prerequisites"] = subtopic.get("prerequisites", [])
                    return data

        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                rate_limit_hits += 1
                if rate_limit_hits > max_rate_limit_retries:
                    print(f"      [FAIL] Hit rate limit {max_rate_limit_retries} times. Giving up.")
                    return {
                        "name": subtopic["name"], "description": "Rate limited",
                        "raw_content": "", "key_formulas": [], "common_mistakes": [],
                        "jee_frequency": subtopic["jee_freq"], "estimated_minutes": subtopic["est_min"],
                        "question_type_analysis": "", "prerequisites": subtopic.get("prerequisites", []),
                        "_validation_passed": False, "_retry_count": validation_attempt,
                        "_validation_errors": ["Exhausted rate limit retries"],
                    }
                wait_time = min(30 * rate_limit_hits, 300)
                print(f"      [!] Rate limited ({rate_limit_hits}/{max_rate_limit_retries}). Waiting {wait_time}s...")
                time.sleep(wait_time)
                # Do NOT increment validation_attempt — this isn't a content failure
                continue
            else:
                validation_attempt += 1
                print(f"      [!] Generation error (attempt {validation_attempt}): {error_str[:150]}")
                if validation_attempt < max_validation_retries:
                    time.sleep(base_delay)
                else:
                    return {
                        "name": subtopic["name"], "description": "Generation failed",
                        "raw_content": "", "key_formulas": [], "common_mistakes": [],
                        "jee_frequency": subtopic["jee_freq"], "estimated_minutes": subtopic["est_min"],
                        "question_type_analysis": "", "prerequisites": subtopic.get("prerequisites", []),
                        "_validation_passed": False, "_retry_count": validation_attempt,
                        "_validation_errors": [error_str],
                    }

    return {"name": subtopic["name"], "_validation_passed": False, "_retry_count": validation_attempt}


def load_checkpoint() -> dict:
    if CHECKPOINT_FILE.exists():
        return json.loads(CHECKPOINT_FILE.read_text())
    return {"completed": []}


def save_checkpoint(checkpoint: dict):
    CHECKPOINT_FILE.write_text(json.dumps(checkpoint, indent=2))


def sanitize_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in " -_" else "_" for c in name).strip().replace(" ", "_").lower()


def main():
    parser = argparse.ArgumentParser(description="Generate JEE content using Gemini 3.1 Pro")
    parser.add_argument("--subject", type=str, help="Only generate for this subject")
    parser.add_argument("--resume", action="store_true", help="Skip already-completed chapters")
    args = parser.parse_args()

    check_node_environment()
    checkpoint = load_checkpoint()

    subjects_to_process = {args.subject: SYLLABUS[args.subject]} if args.subject else SYLLABUS

    total_subtopics = sum(
        len(topic["subtopics"])
        for subj in subjects_to_process.values()
        for chapter in subj
        for topic in chapter["topics"]
    )

    print("=" * 70)
    print("NeuralJEE Content Generation Pipeline")
    print(f"Model: {MODEL}")
    print(f"Total subtopics: {total_subtopics}")
    print("=" * 70)

    client = get_gemini_client()
    
    processed = 0
    failed = 0
    start_time = time.time()

    for subject_name, chapters in subjects_to_process.items():
        print(f"\n{'='*60}\n  SUBJECT: {subject_name}\n{'='*60}")

        for chapter_idx, chapter in enumerate(chapters):
            chapter_key = f"{subject_name}_{chapter['name']}"
            output_filename = f"{sanitize_filename(subject_name)}_{sanitize_filename(chapter['name'])}.json"
            output_path = OUTPUT_DIR / output_filename
            
            existing_concepts = {}
            if output_path.exists():
                try:
                    loaded = json.loads(output_path.read_text(encoding="utf-8"))
                    existing_concepts = {c["name"]: c for c in loaded}
                except:
                    pass

            if args.resume and chapter_key in checkpoint["completed"]:
                # Fast skip if fully completed and all passed validation
                all_passed = all(c.get("_validation_passed", False) for c in existing_concepts.values())
                if all_passed and len(existing_concepts) == sum(len(t["subtopics"]) for t in chapter["topics"]):
                    processed += len(existing_concepts)
                    print(f"\n  [SKIP] {chapter['name']} — already complete & validated")
                    continue

            print(f"\n  Chapter {chapter_idx+1}: {chapter['name']}")
            chapter_concepts = []
            all_chapter_passed = True

            for topic in chapter["topics"]:
                for subtopic in topic["subtopics"]:
                    processed += 1
                    
                    # Check if already generated and passed
                    if args.resume and subtopic["name"] in existing_concepts:
                        existing = existing_concepts[subtopic["name"]]
                        if existing.get("_validation_passed", False):
                            chapter_concepts.append(existing)
                            print(f"      [{processed}/{total_subtopics}] {subtopic['name']} ... [SKIPPED - Valid]")
                            continue
                    
                    print(f"      [{processed}/{total_subtopics}] {subtopic['name']} ... ", end="", flush=True)

                    concept = generate_subtopic_content(client, subtopic, subject_name, chapter["name"], topic["name"])
                    concept["_subject"] = subject_name
                    concept["_chapter"] = chapter["name"]

                    if not concept.get("_validation_passed", False):
                        failed += 1
                        all_chapter_passed = False
                        print(f"FAILED VALIDATION")
                    else:
                        print(f"OK")

                    chapter_concepts.append(concept)
                    time.sleep(REQUEST_DELAY)

            # Save chapter output
            output_path.write_text(json.dumps(chapter_concepts, indent=2, ensure_ascii=False), encoding="utf-8")
            
            if all_chapter_passed and chapter_key not in checkpoint["completed"]:
                checkpoint["completed"].append(chapter_key)
                save_checkpoint(checkpoint)

    print("\n" + "=" * 70)
    print("GENERATION COMPLETE")
    print(f"  Processed: {processed}")
    print(f"  Failed: {failed}")
    print("=" * 70)

if __name__ == "__main__":
    main()
