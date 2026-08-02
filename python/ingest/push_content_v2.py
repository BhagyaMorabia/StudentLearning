#!/usr/bin/env python3
"""
push_content_v2.py — Push 4-page progressive content to Neon PostgreSQL.

Reads the V2 content JSON files (from generate_content_v2.py) and updates
the subtopics table with the 4 content columns:
  - content_foundation
  - content_deep_concepts
  - content_formulas
  - content_practice

PREREQUISITE: The subtopics must already exist in the database (created by
seed_full_curriculum.py). This script UPDATEs existing rows by matching
on subtopic name + topic + chapter.

Input:  python/data/content_v2/*.json
Output: Neon PostgreSQL (subtopics table — 4 content columns)

Usage:
    python push_content_v2.py                      # Push all
    python push_content_v2.py --subject Physics    # Only Physics
    python push_content_v2.py --dry-run            # Show what would be pushed
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local from project root
ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

INPUT_DIR = Path(__file__).parent.parent / "data" / "content_v2"

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


def find_subtopic_id(cursor, subtopic_name: str, chapter_name: str, subject_name: str) -> str | None:
    """Find the subtopic UUID by matching name through the hierarchy."""
    cursor.execute("""
        SELECT st.id
        FROM subtopics st
        JOIN topics t ON st.topic_id = t.id
        JOIN chapters c ON t.chapter_id = c.id
        JOIN subjects s ON c.subject_id = s.id
        WHERE st.name = %s
          AND c.name = %s
          AND s.name = %s
        LIMIT 1
    """, (subtopic_name, chapter_name, subject_name))
    
    row = cursor.fetchone()
    return row[0] if row else None


def push_v2_content(conn, subject_filter: str = None, dry_run: bool = False):
    """Push all V2 content to the database."""
    cursor = conn.cursor()
    
    json_files = sorted(INPUT_DIR.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {INPUT_DIR}")
        return
    
    total_updated = 0
    total_skipped = 0
    total_not_found = 0
    
    for json_path in json_files:
        # Extract subject from filename (e.g., "physics_laws_of_motion.json" -> "Physics")
        filename = json_path.stem
        file_subject = filename.split("_")[0].title()
        
        if subject_filter and file_subject.lower() != subject_filter.lower():
            continue
        
        print(f"\n  Processing: {json_path.name}")
        
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"    ERROR reading file: {e}")
            continue
        
        for item in data:
            name = item.get("name", "Unknown")
            chapter = item.get("_chapter", "")
            subject = item.get("_subject", "")
            pages = item.get("pages", {})
            
            if not pages:
                total_skipped += 1
                continue
            
            # Extract content from pages
            foundation = pages.get("foundation", {}).get("content", "")
            deep_concepts = pages.get("deep_concepts", {}).get("content", "")
            formulas = pages.get("formulas", {}).get("content", "")
            practice = pages.get("practice", {}).get("content", "")
            
            # Skip if no content at all
            if not any([foundation, deep_concepts, formulas, practice]):
                total_skipped += 1
                print(f"    SKIP (no content): {name}")
                continue
            
            if dry_run:
                f_wc = len(foundation.split()) if foundation else 0
                d_wc = len(deep_concepts.split()) if deep_concepts else 0
                fm_wc = len(formulas.split()) if formulas else 0
                p_wc = len(practice.split()) if practice else 0
                print(f"    [DRY RUN] {name}: F={f_wc}w, D={d_wc}w, Fm={fm_wc}w, P={p_wc}w")
                total_updated += 1
                continue
            
            # Find the subtopic in the database
            subtopic_id = find_subtopic_id(cursor, name, chapter, subject)
            
            if not subtopic_id:
                total_not_found += 1
                print(f"    NOT FOUND in DB: {name} ({subject} → {chapter})")
                continue
            
            # Update the 4 content columns
            cursor.execute("""
                UPDATE subtopics
                SET content_foundation = %s,
                    content_deep_concepts = %s,
                    content_formulas = %s,
                    content_practice = %s,
                    content_status = 'VERIFIED'
                WHERE id = %s
            """, (
                foundation or None,
                deep_concepts or None,
                formulas or None,
                practice or None,
                str(subtopic_id),
            ))
            
            total_updated += 1
            print(f"    ✓ {name}")
    
    if not dry_run:
        conn.commit()
    
    cursor.close()
    
    print(f"\n{'='*60}")
    print(f"  Updated: {total_updated}")
    print(f"  Skipped: {total_skipped}")
    print(f"  Not found: {total_not_found}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Push V2 content to database")
    parser.add_argument("--subject", type=str, help="Only push this subject")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be pushed")
    args = parser.parse_args()
    
    if args.dry_run:
        print("[DRY RUN MODE]")
        push_v2_content(None, args.subject, dry_run=True)
        return
    
    conn = get_connection()
    try:
        push_v2_content(conn, args.subject, dry_run=False)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
