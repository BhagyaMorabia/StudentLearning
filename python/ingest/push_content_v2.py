#!/usr/bin/env python3
"""
push_content_v2.py — Push 4-page progressive content to Neon PostgreSQL and generate vector chunks.

Reads the V2 content JSON files (from generate_content_v2.py) and:
1. Updates the subtopics table with the 4 content columns.
2. Slices the content into ~300-word chunks.
3. Generates 768-dimensional embeddings using Google GenAI (text-embedding-004).
4. Upserts the chunks into the `content_chunks` table for precise RAG.

PREREQUISITE: 
- The subtopics must already exist in the database (created by seed_full_curriculum.py).
- GEMINI_API_KEY must be set in .env.local.
"""

import os
import sys
import json
import argparse
import hashlib
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load .env.local from project root
ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

INPUT_DIR = Path(__file__).parent.parent / "data" / "content_v2"
DATABASE_URL = os.getenv("PYTHON_DATABASE_URL") or os.getenv("DATABASE_URL")
VERTEX_PROJECT = os.getenv("VERTEX_PROJECT")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION")

if VERTEX_PROJECT and VERTEX_LOCATION:
    genai_client = genai.Client(vertexai=True, project=VERTEX_PROJECT, location=VERTEX_LOCATION)
else:
    print("WARNING: VERTEX_PROJECT or VERTEX_LOCATION not set. Embeddings will fail.")
    genai_client = None

def get_connection():
    if not DATABASE_URL:
        print("ERROR: PYTHON_DATABASE_URL or DATABASE_URL not set in .env.local")
        sys.exit(1)

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

def chunk_text(text: str, max_words: int = 300, overlap: int = 50) -> list[str]:
    """Slice text into chunks with a sliding window."""
    if not text:
        return []
    words = text.split()
    if not words:
        return []
        
    chunks = []
    step = max(1, max_words - overlap)
    
    for i in range(0, len(words), step):
        chunk_words = words[i:i + max_words]
        chunks.append(" ".join(chunk_words))
        
    return chunks

def embed_chunks_batch(chunk_texts: list[str], retries: int = 8) -> list[list[float]]:
    """Generate embeddings for a list of chunks in a single batch request to save quota."""
    if not chunk_texts:
        return []
    if not genai_client:
        raise ValueError("Vertex AI is not configured. Cannot generate embeddings.")
        
    for attempt in range(retries):
        try:
            response = genai_client.models.embed_content(
                model='text-embedding-004',
                contents=chunk_texts,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            return [emb.values for emb in response.embeddings]
        except Exception as e:
            if "429" in str(e) or "Quota exceeded" in str(e):
                wait_time = 2 ** attempt
                print(f"      [429 Quota] Batch retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise e
    raise Exception("Max retries exceeded for embeddings")

def push_v2_content(conn, subject_filter: str = None, dry_run: bool = False, skip_embeddings: bool = False, force: bool = False):
    """Push all V2 content to the database and generate chunks."""
    cursor = None if dry_run else conn.cursor()
    
    json_files = sorted(INPUT_DIR.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {INPUT_DIR}")
        return
    
    total_updated = 0
    total_skipped = 0
    total_not_found = 0
    total_chunks = 0
    
    for json_path in json_files:
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
            
            foundation = pages.get("foundation", {}).get("content", "")
            deep_concepts = pages.get("deep_concepts", {}).get("content", "")
            formulas = pages.get("formulas", {}).get("content", "")
            practice = pages.get("practice", {}).get("content", "")
            
            if not any([foundation, deep_concepts, formulas, practice]):
                total_skipped += 1
                print(f"    SKIP (no content): {name}")
                continue
            
            if dry_run:
                total_updated += 1
                continue
            
            if cursor is None:
                raise RuntimeError("Database cursor unavailable outside dry-run mode")

            subtopic_id = find_subtopic_id(cursor, name, chapter, subject)
            
            if not subtopic_id:
                total_not_found += 1
                print(f"    NOT FOUND in DB: {name} ({subject} → {chapter})")
                continue
            
            # Checkpoint: Skip if already generated AND actually has content
            if not force:
                cursor.execute("SELECT content_status, content_foundation FROM subtopics WHERE id = %s", (str(subtopic_id),))
                status_row = cursor.fetchone()
                if status_row and status_row[0] == 'AI_GENERATED' and status_row[1] is not None:
                    print(f"    [SKIP] Already processed: {name}")
                    total_skipped += 1
                    continue
            
            # Update the 4 content columns on subtopics
            cursor.execute("""
                UPDATE subtopics
                SET content_foundation = %s,
                    content_deep_concepts = %s,
                    content_formulas = %s,
                    content_practice = %s,
                    content_status = 'AI_GENERATED'
                WHERE id = %s
            """, (
                foundation or None,
                deep_concepts or None,
                formulas or None,
                practice or None,
                str(subtopic_id),
            ))
            
            # Process Chunks
            if not skip_embeddings:
                # Remove existing chunks for this subtopic to maintain idempotency
                cursor.execute("DELETE FROM content_chunks WHERE subtopic_id = %s", (str(subtopic_id),))
                
                pages_dict = {
                    'foundation': foundation,
                    'deep_concepts': deep_concepts,
                    'formulas': formulas,
                    'practice': practice
                }

                for page_type, content in pages_dict.items():
                    if not content:
                        continue
                        
                    chunks = chunk_text(content, max_words=300, overlap=50)
                    if not chunks:
                        continue
                        
                    try:
                        # Batch embed all chunks for this page in 1 request
                        embeddings = embed_chunks_batch(chunks)
                        
                        for i, chunk in enumerate(chunks):
                            word_count = len(chunk.split())
                            source_hash = hashlib.md5(chunk.encode('utf-8')).hexdigest()
                            embedding_str = f"[{','.join(str(x) for x in embeddings[i])}]"
                            
                            cursor.execute("""
                                INSERT INTO content_chunks 
                                (subtopic_id, page_type, chunk_index, content, word_count, source_hash, embedding, content_status)
                                VALUES (%s, %s, %s, %s, %s, %s, %s::vector, 'AI_GENERATED')
                            """, (
                                str(subtopic_id),
                                page_type,
                                i,
                                chunk,
                                word_count,
                                source_hash,
                                embedding_str
                            ))
                            total_chunks += 1
                    except Exception as e:
                        print(f"      ERROR embedding {name} - {page_type}: {e}")
            
            total_updated += 1
            print(f"    [OK] {name}")
            
            if not dry_run:
                conn.commit()  # Progressive commit per subtopic
    
    if cursor is not None:
        cursor.close()
    
    print(f"\n{'='*60}")
    print(f"  Updated Subtopics: {total_updated}")
    print(f"  Generated Chunks : {total_chunks}")
    print(f"  Skipped          : {total_skipped}")
    print(f"  Not found        : {total_not_found}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Push V2 content to database with vector chunks")
    parser.add_argument("--subject", type=str, help="Only push this subject")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be pushed")
    parser.add_argument("--skip-embeddings", action="store_true", help="Only push text, do not generate embeddings")
    parser.add_argument("--force", action="store_true", help="Force re-ingest even if already processed")
    args = parser.parse_args()
    
    if args.dry_run:
        print("[DRY RUN MODE]")
        push_v2_content(None, args.subject, dry_run=True, skip_embeddings=args.skip_embeddings, force=args.force)
        return
        
    if not args.skip_embeddings and not (VERTEX_PROJECT and VERTEX_LOCATION):
        print("WARNING: Vertex AI credentials are not set. Use --skip-embeddings to push text without chunks.")
        sys.exit(1)
    
    conn = get_connection()
    try:
        push_v2_content(conn, args.subject, dry_run=False, skip_embeddings=args.skip_embeddings, force=args.force)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
