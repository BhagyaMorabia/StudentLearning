#!/usr/bin/env python3
"""
generate_prerequisites.py — FAANG-grade Knowledge Graph Generator

Uses deterministic UUIDs to build a stateless prerequisite graph.
Operates in two heavily chunked passes to prevent context exhaustion and hallucination:
1. Intra-Subject Pass (Chapter by Chapter against all previous subject concepts)
2. Cross-Subject Pass (Math -> Physics, Physics -> Chemistry)

Outputs a strict JSON array of { from_id, to_id } UUID pairs to be bulk inserted by the seeder.
"""

import os
import sys
import json
import uuid
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from tenacity import retry, wait_exponential, stop_after_attempt

# Load .env.local
ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai is not installed.")
    sys.exit(1)

from jee_syllabus import SYLLABUS

OUTPUT_FILE = Path(__file__).parent.parent / "data" / "prerequisite_edges.json"
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

# ── FAANG Architecture: Deterministic UUID generation ─────────────────────────
def get_deterministic_id(path_str: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"neuraljee://{path_str}"))

# ── Pydantic Schema for Strict JSON Output ────────────────────────────────────
class PrerequisiteEdge(BaseModel):
    from_id: str = Field(description="UUID of the prerequisite subtopic")
    to_id: str = Field(description="UUID of the target subtopic")

class PrerequisiteGraph(BaseModel):
    edges: list[PrerequisiteEdge]

# ── Rate Limiting & Retry Wrapper ─────────────────────────────────────────────
@retry(
    wait=wait_exponential(multiplier=1, min=4, max=30),
    stop=stop_after_attempt(5),
)
def call_gemini(client, model: str, prompt: str):
    return client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=PrerequisiteGraph,
            temperature=0.0, # Zero creativity, maximum precision
        ),
    )

def flatten_syllabus():
    """Returns a list of dicts: { id, title, subject, chapter, topic }"""
    nodes = []
    for subject_name, chapters in SYLLABUS.items():
        for chapter in chapters:
            for topic in chapter["topics"]:
                for subtopic in topic["subtopics"]:
                    s_name = subtopic["name"]
                    s_id = get_deterministic_id(f"{subject_name}/{chapter['name']}/{topic['name']}/{s_name}")
                    nodes.append({
                        "id": s_id,
                        "title": s_name,
                        "subject": subject_name,
                        "chapter": chapter["name"],
                        "topic": topic["name"]
                    })
    return nodes

def format_candidates(nodes: list) -> str:
    return json.dumps([{"id": n["id"], "title": n["title"], "chapter": n["chapter"]} for n in nodes], indent=2)

def generate_graph(dry_run: bool = False):
    nodes = flatten_syllabus()
    client = None
    if not dry_run:
        client = genai.Client(
            vertexai=True,
            project=os.getenv("VERTEX_PROJECT", "student-501106"),
            location=os.getenv("VERTEX_LOCATION", "global"),
        )
    
    all_edges = []
    
    # Organize by subject for processing
    subjects = {"Physics": [], "Chemistry": [], "Mathematics": []}
    for n in nodes:
        subjects[n["subject"]].append(n)

    print("=" * 60)
    print("Phase 1: Intra-Subject Mapping (gemini-3.1-pro-preview)")
    print("=" * 60)
    
    # ── PASS 1: INTRA-SUBJECT ────────────────────────────────────────────────
    for subject_name, subject_nodes in subjects.items():
        # Group by chapter to prevent token bloat
        chapters = {}
        for n in subject_nodes:
            chapters.setdefault(n["chapter"], []).append(n)
            
        previous_chapters_nodes = []
        
        for chapter_name, chapter_nodes in chapters.items():
            if not previous_chapters_nodes:
                previous_chapters_nodes.extend(chapter_nodes)
                continue # First chapter has no intra-subject prerequisites
                
            print(f"Mapping {subject_name} -> {chapter_name} ({len(chapter_nodes)} targets against {len(previous_chapters_nodes)} candidates)")
            
            prompt = f"""You are a strict curriculum graph builder.
Your task is to identify strict prerequisite dependencies for the target subtopics.

CANDIDATE PREREQUISITES (You can ONLY pick `from_id` from this list):
{format_candidates(previous_chapters_nodes)}

TARGET SUBTOPICS (You must pick `to_id` ONLY from this list):
{format_candidates(chapter_nodes)}

RULES:
1. Only create an edge if understanding the target subtopic STRICTLY REQUIRES understanding the candidate prerequisite.
2. Return a JSON array of edges with `from_id` (the prerequisite) and `to_id` (the target).
3. Do not invent IDs. You must use the exact UUIDs provided.
"""
            
            if not dry_run:
                try:
                    response = call_gemini(client, 'gemini-3.1-pro-preview', prompt)
                    parsed = json.loads(response.text)
                    edges = parsed.get("edges", [])
                    all_edges.extend(edges)
                    print(f"  -> Found {len(edges)} intra-subject edges.")
                except Exception as e:
                    import tenacity
                    if isinstance(e, tenacity.RetryError):
                        real_error = e.last_attempt.exception()
                        print(f"  -> Vertex API Error: {real_error}")
                    else:
                        print(f"  -> Error: {e}")
                time.sleep(4) # Rate limit padding
            
            # Add current chapter to candidates for the next chapter
            previous_chapters_nodes.extend(chapter_nodes)

    print("\n" + "=" * 60)
    print("Phase 2: Cross-Subject Mapping (gemini-3.1-pro-preview)")
    print("=" * 60)

    # ── PASS 2: CROSS-SUBJECT ────────────────────────────────────────────────
    cross_passes = [
        ("Mathematics", "Physics"),
        ("Physics", "Chemistry")
    ]
    
    for from_subject, to_subject in cross_passes:
        candidates = subjects[from_subject]
        
        # We still chunk the target by chapter to keep output token sizes small
        targets_by_chapter = {}
        for n in subjects[to_subject]:
            targets_by_chapter.setdefault(n["chapter"], []).append(n)
            
        for chapter_name, chapter_nodes in targets_by_chapter.items():
            print(f"Mapping {from_subject} -> {to_subject} ({chapter_name})")
            
            prompt = f"""You are a master scientific curriculum mapper.
Your task is to identify strict cross-subject prerequisite dependencies.

CANDIDATE PREREQUISITES from {from_subject} (Pick `from_id` ONLY from here):
{format_candidates(candidates)}

TARGET SUBTOPICS from {to_subject} (Pick `to_id` ONLY from here):
{format_candidates(chapter_nodes)}

RULES:
1. Focus heavily on mathematical tools required for physics (e.g., Vectors -> Mechanics, Calculus -> Kinematics).
2. Focus on physical principles required for chemistry (e.g., Thermodynamics, Atomic Structure -> Chemical Bonding).
3. Only output strict dependencies.
4. Return a JSON array of edges with `from_id` and `to_id`. Use exact UUIDs.
"""

            if not dry_run:
                try:
                    response = call_gemini(client, 'gemini-3.1-pro-preview', prompt)
                    parsed = json.loads(response.text)
                    edges = parsed.get("edges", [])
                    all_edges.extend(edges)
                    print(f"  -> Found {len(edges)} cross-subject edges.")
                except Exception as e:
                    import tenacity
                    if isinstance(e, tenacity.RetryError):
                        real_error = e.last_attempt.exception()
                        print(f"  -> Vertex API Error: {real_error}")
                    else:
                        print(f"  -> Error: {e}")
                time.sleep(5) # Rate limit padding

    if not dry_run:
        # Deduplicate edges
        unique_edges = []
        seen = set()
        for e in all_edges:
            pair = (e.get("from_id"), e.get("to_id"))
            if pair not in seen and pair[0] and pair[1]:
                seen.add(pair)
                unique_edges.append(e)
                
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(unique_edges, f, indent=2)
            
        print(f"\nSuccessfully generated {len(unique_edges)} total prerequisite edges.")
        print(f"Saved to {OUTPUT_FILE}")
    else:
        print("\nDry run complete. No API calls made.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print payload structure without hitting Gemini")
    args = parser.parse_args()
    
    generate_graph(args.dry_run)
