#!/usr/bin/env python3
"""
seed_full_curriculum.py — Seed the entire JEE curriculum into Neon PostgreSQL.

This script:
1. Creates deterministic UUIDs based on names (subject/chapter/topic/subtopic)
2. UPSERTS subjects, chapters, topics from jee_syllabus.py
3. UPSERTS all subtopics with generated content + embeddings from concepts_json/
4. Protects human-verified content: does NOT overwrite if content_status == 'VERIFIED'
5. Wires up prerequisite edges between subtopics, reading directly from the Python SYLLABUS.

Usage:
    python seed_full_curriculum.py              # Safe UPSERT run
    python seed_full_curriculum.py --force-clear # DANGEROUS: Wipes DB first
"""

import os
import sys
import json
import uuid
import argparse
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

from jee_syllabus import SYLLABUS

INPUT_DIR = Path(__file__).parent.parent / "data" / "concepts_json"

DATABASE_URL = os.getenv("PYTHON_DATABASE_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env.local")
    sys.exit(1)


def get_connection():
    try:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)


def clear_database(conn):
    cur = conn.cursor()
    tables = [
        "question_attempts", "student_mastery", "learning_events",
        "content_cache", "questions", "prerequisites", "subtopics",
        "topics", "chapters", "subjects"
    ]
    for table in tables:
        try:
            cur.execute(f"DELETE FROM {table};")
            print(f"  Cleared: {table}")
        except Exception as e:
            print(f"  Skip {table}: {e}")
            conn.rollback()
    conn.commit()
    cur.close()


def load_generated_content() -> dict:
    content = {}
    json_files = list(INPUT_DIR.glob("*.json"))
    for json_path in json_files:
        try:
            concepts = json.loads(json_path.read_text(encoding="utf-8"))
            for c in concepts:
                if c.get("_validation_passed"):
                    key = (c.get("_subject"), c.get("_chapter"), c.get("name").lower().strip())
                    content[key] = c
        except Exception:
            pass
    return content


def get_deterministic_id(path_str: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"neuraljee://{path_str}"))


def seed_curriculum(conn, content_map: dict):
    cur = conn.cursor()

    # Track all subtopic IDs by name for prerequisites
    # Key: lowercase_subtopic_name, Value: deterministic_uuid
    all_subtopic_ids = {}
    prereq_edges = [] 

    total_upserts = 0

    for subject_name, chapters in SYLLABUS.items():
        subject_id = get_deterministic_id(subject_name)
        order_idx = {"Physics": 1, "Chemistry": 2, "Mathematics": 3}.get(subject_name, 99)

        cur.execute("""
            INSERT INTO subjects (id, name, exam_type, order_index) 
            VALUES (%s, %s, %s, %s) 
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index
        """, (subject_id, subject_name, "BOTH", order_idx))

        for ch_idx, chapter in enumerate(chapters):
            chapter_id = get_deterministic_id(f"{subject_name}/{chapter['name']}")
            
            cur.execute("""
                INSERT INTO chapters (id, subject_id, name, class_year, order_index, jee_weightage_pct) 
                VALUES (%s, %s, %s, %s, %s, %s) 
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, class_year = EXCLUDED.class_year, order_index = EXCLUDED.order_index, jee_weightage_pct = EXCLUDED.jee_weightage_pct
            """, (chapter_id, subject_id, chapter["name"], chapter["class_year"], ch_idx, chapter["jee_weightage_pct"]))

            for t_idx, topic in enumerate(chapter["topics"]):
                topic_id = get_deterministic_id(f"{subject_name}/{chapter['name']}/{topic['name']}")
                
                cur.execute("""
                    INSERT INTO topics (id, chapter_id, name, order_index, difficulty_level) 
                    VALUES (%s, %s, %s, %s, %s) 
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index
                """, (topic_id, chapter_id, topic["name"], t_idx, 3))

                for s_idx, subtopic_def in enumerate(topic["subtopics"]):
                    subtopic_name = subtopic_def["name"]
                    subtopic_id = get_deterministic_id(f"{subject_name}/{chapter['name']}/{topic['name']}/{subtopic_name}")
                    
                    # Store ID for prerequisite wiring
                    all_subtopic_ids[subtopic_name.lower().strip()] = subtopic_id
                    
                    # Store prerequisite edges from SYLLABUS, not from AI output
                    for prereq in subtopic_def.get("prerequisites", []):
                        prereq_edges.append((prereq.lower().strip(), subtopic_id))

                    content_key = (subject_name, chapter["name"], subtopic_name.lower().strip())
                    gen = content_map.get(content_key, {})

                    description = gen.get("description", subtopic_name)
                    raw_content = gen.get("raw_content", "")
                    key_formulas = gen.get("key_formulas", [])
                    common_mistakes = gen.get("common_mistakes", [])
                    jee_freq = gen.get("jee_frequency", subtopic_def["jee_freq"])
                    est_min = gen.get("estimated_minutes", subtopic_def["est_min"])
                    
                    formatted_formulas = [{"latex": f.get("latex", ""), "sympyVerified": False, "description": f.get("description", "")} for f in key_formulas]

                    embedding = gen.get("embedding")
                    embedding_str = f"[{','.join(str(x) for x in embedding)}]" if embedding else None
                    
                    # If we have generated content, it's AI_GENERATED. Otherwise PENDING_REVIEW (schema only)
                    content_status = "AI_GENERATED" if raw_content else "PENDING_REVIEW"

                    try:
                        # Check existing status to protect VERIFIED content
                        cur.execute("SELECT content_status FROM subtopics WHERE id = %s", (subtopic_id,))
                        existing = cur.fetchone()
                        if existing and existing[0] == 'VERIFIED':
                            # Do not overwrite raw_content or status if verified by a human
                            continue

                        if embedding_str:
                            cur.execute("""
                                INSERT INTO subtopics (id, topic_id, name, description, key_formulas, common_mistakes, pyq_frequency, estimated_minutes, raw_content, embedding, content_status, order_index) 
                                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s::vector, %s, %s)
                                ON CONFLICT (id) DO UPDATE SET 
                                    description = EXCLUDED.description,
                                    key_formulas = EXCLUDED.key_formulas,
                                    common_mistakes = EXCLUDED.common_mistakes,
                                    raw_content = EXCLUDED.raw_content,
                                    embedding = EXCLUDED.embedding,
                                    content_status = EXCLUDED.content_status,
                                    order_index = EXCLUDED.order_index
                            """, (subtopic_id, topic_id, subtopic_name, description, json.dumps(formatted_formulas), common_mistakes, jee_freq, est_min, raw_content, embedding_str, content_status, s_idx))
                        else:
                            cur.execute("""
                                INSERT INTO subtopics (id, topic_id, name, description, key_formulas, common_mistakes, pyq_frequency, estimated_minutes, raw_content, content_status, order_index) 
                                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO UPDATE SET 
                                    description = EXCLUDED.description,
                                    key_formulas = EXCLUDED.key_formulas,
                                    common_mistakes = EXCLUDED.common_mistakes,
                                    raw_content = EXCLUDED.raw_content,
                                    content_status = EXCLUDED.content_status,
                                    order_index = EXCLUDED.order_index
                            """, (subtopic_id, topic_id, subtopic_name, description, json.dumps(formatted_formulas), common_mistakes, jee_freq, est_min, raw_content, content_status, s_idx))
                        
                        total_upserts += 1
                    except Exception as e:
                        print(f"    ERROR inserting '{subtopic_name}': {e}")
                        conn.rollback()

    conn.commit()
    print(f"  [OK] UPSERTED {total_upserts} subtopics.")

    # ── Wire up prerequisites ───────────────────────────────────────────────
    print(f"\n{'='*50}")
    print("  Wiring Prerequisites (From Python Syllabus)")
    print(f"{'='*50}")

    prereqs_added = 0
    for from_name, to_id in prereq_edges:
        from_id = all_subtopic_ids.get(from_name)
        if not from_id:
            print(f"  [!] Prerequisite '{from_name}' not found in syllabus.")
            continue
            
        try:
            # We don't have a unique constraint on (from_id, to_id) except PK maybe? 
            # Prerequisites uses a composite PK (from_subtopic_id, to_subtopic_id)
            cur.execute("""
                INSERT INTO prerequisites (from_subtopic_id, to_subtopic_id, strength) 
                VALUES (%s, %s, 2) 
                ON CONFLICT (from_subtopic_id, to_subtopic_id) DO NOTHING
            """, (from_id, to_id))
            prereqs_added += 1
        except Exception as e:
            print(f"  ERROR linking {from_name}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    print(f"  [OK] Wired {prereqs_added} prerequisite edges.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force-clear", action="store_true", help="DANGEROUS: Wipes DB before seeding")
    args = parser.parse_args()

    if args.force_clear:
        confirm = input("WARNING: This will delete ALL data (including verified content). Are you sure? (y/N): ")
        if confirm.lower() != 'y':
            print("Aborted.")
            sys.exit(0)

    print("=" * 60)
    print("NeuralJEE Database Seeder (Safe UPSERT Mode)")
    print("=" * 60)

    conn = get_connection()
    if args.force_clear:
        clear_database(conn)

    content_map = load_generated_content()
    seed_curriculum(conn, content_map)

    conn.close()
    print("\n[OK] Database seeded successfully!")

if __name__ == "__main__":
    main()
