#!/usr/bin/env python3
"""
generate_content_v2.py — Generate 4-page progressive teaching content using Gemini.

For every subtopic in jee_syllabus.py, this script makes 4 separate Gemini API
calls to generate a complete progressive learning experience:

  Page 1 (Foundation):    Prerequisites, basics, intuition, analogies
  Page 2 (Deep Concepts): Rigorous theory, connections, derivations
  Page 3 (Formulas):      Mathematical framework, problem-solving methods
  Page 4 (Practice):      Worked examples, PYQ patterns, revision

Saves progress per-chapter to python/data/content_v2/<subject>_<chapter>.json.
Supports resuming — skips subtopics where all 4 pages passed validation.

Usage:
    python generate_content_v2.py                         # Full run
    python generate_content_v2.py --subject Physics       # Only Physics
    python generate_content_v2.py --chapter "Laws of Motion"  # One chapter
    python generate_content_v2.py --resume                # Skip completed
    python generate_content_v2.py --dry-run               # Show plan, no API calls
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

# Load .env.local from project root
ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

from jee_syllabus import SYLLABUS

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "content_v2"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CHECKPOINT_FILE = OUTPUT_DIR.parent / "generation_v2_checkpoint.json"

# ── Gemini Configuration ─────────────────────────────────────────────────────
VERTEX_PROJECT = os.getenv("VERTEX_PROJECT", "student-501106")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")

MODEL = "gemini-3.1-pro-preview"

# Rate limiting — 4 calls per subtopic, so be conservative
REQUESTS_PER_MINUTE = 14
REQUEST_DELAY = 60 / REQUESTS_PER_MINUTE

# ── Page Names ───────────────────────────────────────────────────────────────
PAGE_NAMES = ["foundation", "deep_concepts", "formulas", "practice"]

# ── Prompts ──────────────────────────────────────────────────────────────────

PROMPT_FOUNDATION = """You are the greatest teacher alive. You have a gift for making complex concepts feel obvious. You use analogies, stories, and clear thinking to build deep understanding from scratch.

SUBTOPIC: {subtopic_name}
SUBJECT: {subject}
CHAPTER: {chapter}
TOPIC: {topic}

Write PAGE 1 of 4: THE FOUNDATION.

This page is for a student who has NEVER encountered this concept before. After reading this, they should have a rock-solid intuitive understanding of what this concept is and why it matters.

WHAT TO INCLUDE:

1. "## Before We Begin" — What does the student already need to know? List 2-4 prerequisite concepts briefly. If they're shaky on those, tell them to review those first. Keep this SHORT — just a checklist.

2. "## The Big Picture" — Why does this concept exist? What real-world problem does it solve? Tell a story. Maybe it's about how scientists struggled with a problem, or how this concept shows up in everyday life. Make the student CURIOUS. This should feel like the opening of a great documentary, not a textbook.

3. "## Understanding {subtopic_name}" — Explain the core idea in the simplest possible language. Use at least 3 different analogies from everyday life. If you're explaining friction, talk about sliding a book on a table, walking on ice, rubbing your hands together. Every abstract idea needs a concrete mental image.

   Break this into multiple subsections with ### headings as needed. Go step by step. Never assume the student "already knows" something — if you use a term, define it right there.

4. "## Visualizing It" — Include a Mermaid diagram that helps the student SEE the concept. This could be a mind-map, a flowchart of how things connect, or a process diagram. Use ```mermaid code blocks.

5. "## Why Should You Care?" — Connect this concept to the bigger picture. How does it connect to other chapters? Where will they see this again in more advanced topics? Make them feel like learning this is an investment that pays off later.

6. "## Key Takeaways" — 5-7 bullet points summarizing the core ideas. These should be memorable, almost like mantras.

RULES:
- Write AT LEAST 3000 words. This is a full lesson, not a summary.
- Use $...$ for inline math and $$...$$ for display math (valid KaTeX syntax).
- Use \\frac{{}}{{}} not \\frac a b. Never put math symbols inside \\text{{}}.
- Keep formulas to an absolute minimum on this page — save heavy math for Page 3.
- Your tone should be warm, encouraging, and conversational — like a brilliant friend explaining things over chai.
- Do NOT number your analogies or list them mechanically. Weave them naturally into the explanation.
- Include at least ONE valid Mermaid.js diagram (flowchart, mindmap, etc).
- Do NOT use HTML tags in Mermaid node labels. Quote labels containing special characters.
"""

PROMPT_DEEP_CONCEPTS = """You are a world-class {subject} professor who is famous for giving students deep, interconnected understanding of concepts. You don't just teach facts — you teach HOW to think about problems.

SUBTOPIC: {subtopic_name}
SUBJECT: {subject}
CHAPTER: {chapter}
TOPIC: {topic}

Write PAGE 2 of 4: DEEP CONCEPTS.

The student has already read Page 1 and has a basic intuitive understanding. Now take them DEEPER. This page builds the rigorous theoretical understanding.

WHAT TO INCLUDE:

1. "## Going Deeper" — Start by acknowledging what they already know from Page 1, then transition into the deeper theory. "Now that you have the intuition, let's see the precise mechanics of how this works..."

2. "## The Complete Theory" — Full, rigorous explanation of the concept. Include:
   - Precise definitions (but explain each one in plain language too)
   - The underlying principles and laws
   - Important derivations with EVERY step explained (don't skip steps — show the algebra)
   - Physical/chemical/mathematical reasoning behind each step
   
   Break this into multiple ### subsections. Each subsection should cover one specific aspect.

3. "## Connections & Relationships" — How does this concept relate to other concepts? Create comparison tables where appropriate. For example:
   | Property | Concept A | Concept B |
   |----------|-----------|-----------|
   
   Show how this topic builds on previous chapters and feeds into future ones.

4. "## Common Misconceptions" — List 4-6 things students commonly get WRONG about this topic. For each one:
   - State the wrong belief
   - Explain why it's wrong
   - Give the correct understanding
   
   This is extremely valuable — students learn as much from knowing what's wrong as what's right.

5. "## Special Cases & Boundary Conditions" — When does this concept break down? What are the limiting cases? What assumptions are we making? This builds the kind of deep thinking that separates JEE toppers from average students.

6. "## Thinking Like a Physicist/Chemist/Mathematician" — Teach them the MINDSET. How should they approach problems involving this concept? What questions should they ask themselves? Include a decision-making flowchart in Mermaid.

RULES:
- Write AT LEAST 4000 words. Be thorough and detailed.
- Use $...$ for inline math and $$...$$ for display math (valid KaTeX syntax).
- Use \\frac{{}}{{}} not \\frac a b. Never put math symbols inside \\text{{}}.
- Include at least ONE Mermaid diagram (decision flowchart preferred).
- Show complete derivations — NEVER write "it can be shown that..."
- Your tone should be intellectually stimulating — like a great professor's lecture.
- Do NOT include practice problems — those are on Page 4.
"""

PROMPT_FORMULAS = """You are a JEE/NEET coaching legend. Students come to you because you don't just give them formulas — you give them a SYSTEM for solving any problem. You teach them when to use which formula and WHY.

SUBTOPIC: {subtopic_name}
SUBJECT: {subject}
CHAPTER: {chapter}
TOPIC: {topic}

Write PAGE 3 of 4: FORMULAS & PROBLEM-SOLVING TOOLKIT.

The student understands the concept deeply from Pages 1 & 2. Now arm them with the mathematical tools and problem-solving strategies they need.

WHAT TO INCLUDE:

1. "## The Formula Toolkit" — List EVERY formula relevant to this subtopic. For each formula:
   - Write it in display math: $$formula$$
   - Explain what EVERY symbol means
   - State the CONDITIONS under which this formula is valid
   - Show a quick dimensional analysis check
   
   Present formulas in a logical order — start with the fundamental ones, then show the derived ones.

2. "## Derivations That Matter" — For the most important formulas, show the complete derivation. Step by step. Every line of algebra. Explain the physical meaning at each step. Mark which derivations have been directly asked in JEE.

3. "## The Problem-Solving Flowchart" — This is CRITICAL. Create a detailed Mermaid flowchart that walks students through:
   - Read the problem → What is given? → What is asked?
   - Which category does this fall into?
   - Which formula/approach to use?
   - How to set up the solution?
   
   ```mermaid
   flowchart TD
     A[Read the Problem] --> B{{What type of problem?}}
     B --> C[Type 1] --> D[Use Formula X]
     B --> E[Type 2] --> F[Use Approach Y]
   ```
   
   Make this flowchart DETAILED with at least 8-10 nodes.

4. "## Shortcuts & Smart Tricks" — Tricks that save time in competitive exams. For EACH trick:
   - Show the shortcut
   - Prove WHY it works (so they remember it)
   - Show when it DOESN'T work (to prevent misuse)

5. "## Units & Sign Conventions" — What units to use, sign convention rules, common unit-conversion traps.

6. "## Calculation Mistakes to Avoid" — The specific numerical/algebraic mistakes students make with this topic. Show the wrong approach and the right one side by side.

RULES:
- Write AT LEAST 3500 words.
- Use $...$ for inline math and $$...$$ for display math (valid KaTeX syntax).
- Use \\frac{{}}{{}} not \\frac a b. Never put math symbols inside \\text{{}}.
- Include at least ONE detailed Mermaid flowchart for problem-solving.
- Every formula must have conditions of validity stated.
- Do NOT include full worked examples — those are on Page 4. You can show brief formula applications.
"""

PROMPT_PRACTICE = """You are the most sought-after JEE problem-solving coach in India. You don't just solve problems — you teach students HOW to think through problems so they can solve anything on their own.

SUBTOPIC: {subtopic_name}
SUBJECT: {subject}
CHAPTER: {chapter}
TOPIC: {topic}
TYPICAL JEE PATTERNS: {patterns}

Write PAGE 4 of 4: PRACTICE & WORKED EXAMPLES.

The student has the foundation, deep understanding, and formula toolkit. Now show them how to APPLY everything through carefully crafted examples.

WHAT TO INCLUDE:

1. "## How to Approach {subtopic_name} Problems" — A brief (200 word) overview of the general approach. What should students look for when they see a problem on this topic?

2. "## Worked Examples" — Provide exactly 6 worked examples, progressing in difficulty:

   ### Example 1: Basic Application (⭐)
   ### Example 2: Standard Level (⭐⭐)
   ### Example 3: Intermediate (⭐⭐⭐)
   ### Example 4: JEE Mains Level (⭐⭐⭐⭐)
   ### Example 5: JEE Advanced Level (⭐⭐⭐⭐⭐)
   ### Example 6: Challenge Problem (🔥)

   For EACH example, follow this EXACT structure:
   
   **Problem:** State the complete problem with specific numbers. Include a diagram description if relevant.
   
   **What to Notice:** Before solving, point out the key observations. What clues in the problem tell you which approach to use?
   
   **Solution:**
   - Step 1: [Description of what you're doing and why]
     $$math$$
   - Step 2: ...
   - Continue until the final answer
   
   **Answer:** State the final answer clearly with units.
   
   **What If...?** One variation of the problem to think about. What changes if [condition] is different?

3. "## JEE Pattern Analysis" — How has JEE tested this subtopic historically? What types of questions appear? (MCQ traps, numerical answer types, assertion-reason, etc.)

4. "## Quick Revision" — Bullet-point summary of EVERYTHING from all 4 pages. 10-15 points that capture the essence of this entire subtopic. A student should be able to read this the night before the exam and feel confident.

5. "## Test Yourself" — 4 problems WITHOUT solutions. Just the problem statement and answer. The student should attempt these on their own.
   - Problem 1 (Easy)
   - Problem 2 (Medium)
   - Problem 3 (JEE Mains)
   - Problem 4 (JEE Advanced)

RULES:
- Write AT LEAST 4000 words.
- Use $...$ for inline math and $$...$$ for display math (valid KaTeX syntax).
- Use \\frac{{}}{{}} not \\frac a b. Never put math symbols inside \\text{{}}.
- ALL problems must have SPECIFIC numbers — no generic "find F in terms of m and g" unless that IS the answer.
- Solutions must show EVERY step of algebra. Never skip steps.
- The difficulty progression must be REAL — Example 1 should be genuinely easy, Example 6 genuinely hard.
"""

PROMPTS = {
    "foundation": PROMPT_FOUNDATION,
    "deep_concepts": PROMPT_DEEP_CONCEPTS,
    "formulas": PROMPT_FORMULAS,
    "practice": PROMPT_PRACTICE,
}


# ── Validation ───────────────────────────────────────────────────────────────

def validate_content(raw_content: str) -> tuple[bool, list[str]]:
    """Calls validate_content.js to verify KaTeX and Mermaid syntax."""
    script_path = Path(__file__).parent / "validate_content.js"

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump({"content": raw_content}, f)
        temp_path = f.name

    try:
        result = subprocess.run(
            ["node", str(script_path), temp_path],
            capture_output=True, text=True, timeout=30
        )
        try:
            output = json.loads(result.stdout)
            return output.get("valid", False), output.get("errors", [])
        except json.JSONDecodeError:
            return False, ["Validation script failed to return valid JSON"]
    except subprocess.TimeoutExpired:
        return False, ["Validation timed out"]
    finally:
        os.remove(temp_path)


# ── Gemini Client ────────────────────────────────────────────────────────────

def get_gemini_client():
    try:
        from google import genai
        client = genai.Client(
            vertexai=True,
            project=VERTEX_PROJECT,
            location=VERTEX_LOCATION,
        )
        print(f"[OK] Vertex AI (project={VERTEX_PROJECT}, location={VERTEX_LOCATION})")
        return client
    except ImportError:
        print("ERROR: google-genai not installed. Run: pip install google-genai")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Vertex AI auth failed: {e}")
        print("Run: gcloud auth application-default login")
        sys.exit(1)


def generate_single_page(client, prompt: str, page_name: str) -> tuple[str, bool, list[str]]:
    """Generate content for a single page. Returns (content, is_valid, errors)."""
    from google.genai import types

    max_validation_retries = 2
    max_rate_limit_retries = 8
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
                    temperature=0.2,
                    max_output_tokens=16384,
                ),
            )

            content = response.text.strip() if response.text else ""

            if not content or len(content) < 500:
                validation_attempt += 1
                print(f" [!] {page_name}: too short ({len(content)} chars), retry {validation_attempt}")
                if validation_attempt < max_validation_retries:
                    current_prompt = prompt + "\n\nIMPORTANT: Your previous response was too short. Write AT LEAST 3000 words."
                    time.sleep(base_delay)
                    continue
                return content, False, [f"Content too short: {len(content)} chars"]

            # Validate KaTeX and Mermaid
            is_valid, errors = validate_content(content)

            if is_valid:
                return content, True, []
            else:
                validation_attempt += 1
                print(f" [!] {page_name}: validation failed attempt {validation_attempt}: {errors[0][:80]}...")
                if validation_attempt < max_validation_retries:
                    current_prompt = prompt + f"\n\nYOUR PREVIOUS RESPONSE FAILED VALIDATION:\n{json.dumps(errors[:3])}\nFix the syntax errors. Make sure all KaTeX math is valid and all Mermaid diagrams are valid."
                    time.sleep(base_delay)
                    continue
                return content, False, errors

        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                rate_limit_hits += 1
                if rate_limit_hits > max_rate_limit_retries:
                    print(f" [FAIL] {page_name}: rate limited {max_rate_limit_retries} times")
                    return "", False, ["Exhausted rate limit retries"]
                wait_time = min(30 * rate_limit_hits, 300)
                print(f" [!] Rate limited ({rate_limit_hits}). Waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                validation_attempt += 1
                print(f" [!] {page_name}: error attempt {validation_attempt}: {error_str[:100]}")
                if validation_attempt < max_validation_retries:
                    time.sleep(base_delay)
                else:
                    return "", False, [error_str[:200]]

    return "", False, ["Max retries exhausted"]


def generate_subtopic_content(client, subtopic: dict, subject: str, chapter: str, topic: str) -> dict:
    """Generate all 4 pages for a subtopic."""
    result = {
        "name": subtopic["name"],
        "jee_frequency": subtopic["jee_freq"],
        "estimated_minutes": subtopic["est_min"],
        "prerequisites": subtopic.get("prerequisites", []),
        "pages": {},
        "_all_valid": True,
    }

    format_args = {
        "subtopic_name": subtopic["name"],
        "subject": subject,
        "chapter": chapter,
        "topic": topic,
        "patterns": "; ".join(subtopic["patterns"]) if subtopic["patterns"] else "General problems",
    }

    for page_name in PAGE_NAMES:
        prompt_template = PROMPTS[page_name]
        
        # Only practice prompt uses {patterns}
        try:
            prompt = prompt_template.format(**format_args)
        except KeyError:
            # Some prompts don't use all keys
            prompt = prompt_template.format(
                subtopic_name=format_args["subtopic_name"],
                subject=format_args["subject"],
                chapter=format_args["chapter"],
                topic=format_args["topic"],
            )

        content, is_valid, errors = generate_single_page(client, prompt, page_name)

        word_count = len(content.split()) if content else 0
        result["pages"][page_name] = {
            "content": content,
            "valid": is_valid,
            "errors": errors,
            "word_count": word_count,
        }

        if not is_valid:
            result["_all_valid"] = False

        print(f"    {page_name}: {'OK' if is_valid else 'FAIL'} ({word_count} words)", flush=True)

        # Rate limit between pages
        time.sleep(REQUEST_DELAY)

    return result


# ── Checkpointing ────────────────────────────────────────────────────────────

def load_checkpoint() -> dict:
    if CHECKPOINT_FILE.exists():
        return json.loads(CHECKPOINT_FILE.read_text())
    return {"completed_subtopics": [], "completed_chapters": []}


def save_checkpoint(checkpoint: dict):
    CHECKPOINT_FILE.write_text(json.dumps(checkpoint, indent=2))


def sanitize_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in " -_" else "_" for c in name).strip().replace(" ", "_").lower()


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate 4-page JEE content using Gemini")
    parser.add_argument("--subject", type=str, help="Only generate for this subject")
    parser.add_argument("--chapter", type=str, help="Only generate for this chapter name")
    parser.add_argument("--resume", action="store_true", help="Skip completed subtopics")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without making API calls")
    args = parser.parse_args()

    # Check node environment for validation
    if not shutil.which("node"):
        print("ERROR: Node.js not in PATH")
        sys.exit(1)
    if not (Path(__file__).parent / "node_modules").exists():
        print("ERROR: Run 'npm install' in python/ingest/ first")
        sys.exit(1)

    checkpoint = load_checkpoint()

    # Filter subjects
    subjects_to_process = {}
    if args.subject:
        if args.subject not in SYLLABUS:
            print(f"ERROR: Subject '{args.subject}' not found. Available: {list(SYLLABUS.keys())}")
            sys.exit(1)
        subjects_to_process = {args.subject: SYLLABUS[args.subject]}
    else:
        subjects_to_process = SYLLABUS

    # Count totals
    total_subtopics = 0
    plan = []
    for subj_name, chapters in subjects_to_process.items():
        for chapter in chapters:
            if args.chapter and chapter["name"] != args.chapter:
                continue
            for topic in chapter["topics"]:
                for subtopic in topic["subtopics"]:
                    total_subtopics += 1
                    plan.append(f"  {subj_name} > {chapter['name']} > {subtopic['name']}")

    total_api_calls = total_subtopics * 4
    est_time_min = total_api_calls * REQUEST_DELAY / 60

    print("=" * 70)
    print("NeuralJEE Content Generation V2 -- 4-Page Progressive System")
    print(f"Model: {MODEL}")
    print(f"Subtopics to generate: {total_subtopics}")
    print(f"API calls needed: {total_api_calls} (4 per subtopic)")
    print(f"Estimated time: {est_time_min:.0f} minutes")
    print("=" * 70)

    if args.dry_run:
        print("\n[DRY RUN] Would generate content for:")
        for p in plan[:20]:
            print(p)
        if len(plan) > 20:
            print(f"  ... and {len(plan) - 20} more")
        return

    client = get_gemini_client()

    processed = 0
    failed = 0
    start_time = time.time()

    for subject_name, chapters in subjects_to_process.items():
        print(f"\n{'='*60}\n  SUBJECT: {subject_name}\n{'='*60}")

        for chapter_idx, chapter in enumerate(chapters):
            if args.chapter and chapter["name"] != args.chapter:
                continue

            chapter_key = f"{subject_name}__{chapter['name']}"
            output_filename = f"{sanitize_filename(subject_name)}_{sanitize_filename(chapter['name'])}.json"
            output_path = OUTPUT_DIR / output_filename

            # Load existing data for this chapter
            existing_data = {}
            if output_path.exists():
                try:
                    loaded = json.loads(output_path.read_text(encoding="utf-8"))
                    existing_data = {item["name"]: item for item in loaded}
                except Exception:
                    pass

            print(f"\n  Chapter {chapter_idx+1}: {chapter['name']}")
            chapter_results = []
            all_chapter_valid = True

            for topic in chapter["topics"]:
                for subtopic in topic["subtopics"]:
                    processed += 1
                    subtopic_key = f"{subject_name}__{chapter['name']}__{subtopic['name']}"

                    # Check if already completed
                    if args.resume and subtopic["name"] in existing_data:
                        existing = existing_data[subtopic["name"]]
                        if existing.get("_all_valid", False):
                            chapter_results.append(existing)
                            print(f"    [{processed}/{total_subtopics}] {subtopic['name']} [SKIP - valid]")
                            continue

                    print(f"    [{processed}/{total_subtopics}] {subtopic['name']}")

                    result = generate_subtopic_content(
                        client, subtopic, subject_name, chapter["name"], topic["name"]
                    )
                    result["_subject"] = subject_name
                    result["_chapter"] = chapter["name"]
                    result["_topic"] = topic["name"]

                    if not result["_all_valid"]:
                        failed += 1
                        all_chapter_valid = False

                    chapter_results.append(result)

                    # Save after each subtopic (crash safety)
                    output_path.write_text(
                        json.dumps(chapter_results, indent=2, ensure_ascii=False),
                        encoding="utf-8"
                    )

            # Mark chapter complete
            if all_chapter_valid and chapter_key not in checkpoint["completed_chapters"]:
                checkpoint["completed_chapters"].append(chapter_key)
                save_checkpoint(checkpoint)

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print("GENERATION COMPLETE")
    print(f"  Processed: {processed} subtopics")
    print(f"  Failed: {failed}")
    print(f"  Time: {elapsed/60:.1f} minutes")
    print(f"  Output: {OUTPUT_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    main()
