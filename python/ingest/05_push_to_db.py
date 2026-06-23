#!/usr/bin/env python3
"""
05_push_to_db.py — Push verified concept data to Neon PostgreSQL.

This script reads the processed JSON files (concepts with embeddings, 
SymPy-validated formulas) and inserts them into the Neon database.

PREREQUISITE: Run in Neon SQL console FIRST:
    CREATE EXTENSION IF NOT EXISTS vector;

The script:
1. Creates subtopics with embeddings (pgvector)
2. Sets up prerequisite graph edges
3. Marks content_status as 'VERIFIED' for Claude-safe content

Input:  python/data/concepts_json/*.json
Output: Neon PostgreSQL (subtopics table)

Usage:
    python 05_push_to_db.py --chapter-id UUID --subject-id UUID
"""

import os
import sys
import json
import argparse
import uuid
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

INPUT_DIR = Path(__file__).parent.parent / "data" / "concepts_json"

DATABASE_URL = os.getenv("PYTHON_DATABASE_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)


def get_connection():
    try:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)


def push_concepts(concepts: list[dict], topic_id: str, conn) -> dict[str, str]:
    """
    Insert concepts as subtopics into the database.
    Returns a mapping of concept_name → subtopic_uuid (for prerequisite edges).
    """
    cursor = conn.cursor()
    name_to_id: dict[str, str] = {}

    for concept in concepts:
        subtopic_id = str(uuid.uuid4())
        name = concept.get("name", "Unknown Concept")
        name_to_id[name.lower()] = subtopic_id

        # Format key_formulas JSONB
        key_formulas = [
            {
                "latex": f.get("latex", ""),
                "sympyVerified": f.get("sympy_verified", False),
                "description": f.get("description", ""),
            }
            for f in concept.get("key_formulas", [])
        ]

        # Format embedding as pgvector literal: [0.1,0.2,...]
        embedding = concept.get("embedding")
        embedding_str = f"[{','.join(str(x) for x in embedding)}]" if embedding else None

        # Determine content_status based on formula validation
        has_unverified = any(
            not f.get("sympy_verified", True)
            for f in concept.get("key_formulas", [])
            if f.get("sympy_expr")
        )
        content_status = "PENDING_REVIEW" if has_unverified else "VERIFIED"

        try:
            if embedding_str:
                cursor.execute(
                    """
                    INSERT INTO subtopics (
                        id, topic_id, name, description, key_formulas,
                        common_mistakes, pyq_frequency, estimated_minutes,
                        embedding, content_status, order_index
                    ) VALUES (
                        %s, %s, %s, %s, %s::jsonb,
                        %s, %s, %s,
                        %s::vector, %s, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        subtopic_id,
                        topic_id,
                        name,
                        concept.get("description"),
                        json.dumps(key_formulas),
                        concept.get("common_mistakes", []),
                        concept.get("jee_frequency", 1),
                        concept.get("estimated_minutes", 15),
                        embedding_str,
                        content_status,
                        0,  # order_index — sort manually later
                    ),
                )
            else:
                # Insert without embedding if not yet generated
                cursor.execute(
                    """
                    INSERT INTO subtopics (
                        id, topic_id, name, description, key_formulas,
                        common_mistakes, pyq_frequency, estimated_minutes,
                        content_status, order_index
                    ) VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        subtopic_id,
                        topic_id,
                        name,
                        concept.get("description"),
                        json.dumps(key_formulas),
                        concept.get("common_mistakes", []),
                        concept.get("jee_frequency", 1),
                        concept.get("estimated_minutes", 15),
                        content_status,
                        0,
                    ),
                )
        except Exception as e:
            print(f"  ⚠ Failed to insert '{name}': {e}")
            conn.rollback()
            continue

    conn.commit()
    cursor.close()
    return name_to_id


def push_prerequisites(
    concepts: list[dict],
    name_to_id: dict[str, str],
    conn,
) -> None:
    """Insert prerequisite edges into the prerequisites table."""
    cursor = conn.cursor()
    edges = 0

    for concept in concepts:
        to_id = name_to_id.get(concept["name"].lower())
        if not to_id:
            continue

        for prereq_name in concept.get("prerequisites", []):
            from_id = name_to_id.get(prereq_name.lower())
            if not from_id:
                continue  # Prerequisite not in this batch

            try:
                cursor.execute(
                    """
                    INSERT INTO prerequisites (from_subtopic_id, to_subtopic_id, strength)
                    VALUES (%s, %s, 2)
                    ON CONFLICT DO NOTHING
                    """,
                    (from_id, to_id),
                )
                edges += 1
            except Exception as e:
                print(f"  ⚠ Failed to insert edge: {e}")

    conn.commit()
    cursor.close()
    print(f"  [OK] Created {edges} prerequisite edges")


def main():
    parser = argparse.ArgumentParser(description="Push concepts to Neon database")
    parser.add_argument("--topic-id", required=True, help="UUID of the parent topic in DB")
    parser.add_argument("--file", type=str, help="Specific JSON file to push")
    args = parser.parse_args()

    if args.file:
        json_files = [INPUT_DIR / args.file]
    else:
        json_files = list(INPUT_DIR.glob("*.json"))

    if not json_files:
        print(f"No JSON files found in {INPUT_DIR}")
        return

    print(f"Connecting to Neon PostgreSQL...")
    conn = get_connection()
    print("[OK] Connected")

    for json_path in json_files:
        if not json_path.exists():
            print(f"File not found: {json_path}")
            continue

        print(f"\nPushing: {json_path.name}")
        concepts = json.loads(json_path.read_text(encoding="utf-8"))

        if not isinstance(concepts, list):
            print(f"  ⚠ Unexpected format")
            continue

        print(f"  {len(concepts)} concepts to push...")
        name_to_id = push_concepts(concepts, args.topic_id, conn)
        print(f"  [OK] Inserted {len(name_to_id)} subtopics")

        push_prerequisites(concepts, name_to_id, conn)

    conn.close()
    print("\n[OK] Done! Run your Next.js app and test RAG retrieval.")
    print("  Test: POST /api/ai/teach with a subtopicId from the DB")


if __name__ == "__main__":
    main()
