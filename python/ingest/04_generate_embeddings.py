#!/usr/bin/env python3
"""
04_generate_embeddings.py — Generate 768-dim BGE-small embeddings for all concepts.

Uses sentence-transformers with BAAI/bge-small-en-v1.5 (same model as the
Next.js @xenova/transformers embedding — ensures query and document vectors
are in the same embedding space).

Embeddings are added to each concept JSON as an "embedding" field (list of 768 floats).

Input:  python/data/concepts_json/*.json
Output: Same files, updated with embedding field

Usage:
    python 04_generate_embeddings.py
"""

import json
import sys
from pathlib import Path
from tqdm import tqdm

INPUT_DIR = Path(__file__).parent.parent / "data" / "concepts_json"
BATCH_SIZE = 32  # Process embeddings in batches for efficiency


def get_text_to_embed(concept: dict) -> str:
    """
    Create the text we embed for each concept.
    We embed name + description + formula descriptions.
    This matches what the query embeds: the subtopic name/description.
    """
    parts = [concept.get("name", "")]
    if desc := concept.get("description"):
        parts.append(desc)
    for formula in concept.get("key_formulas", []):
        if fdesc := formula.get("description"):
            parts.append(fdesc)
    return " ".join(parts)


def generate_embeddings(concepts: list[dict]) -> list[dict]:
    """Add 'embedding' field to each concept dict."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("ERROR: sentence-transformers not installed")
        print("Run: pip install sentence-transformers")
        sys.exit(1)

    print("  Loading BAAI/bge-small-en-v1.5 model...")
    model = SentenceTransformer("BAAI/bge-small-en-v1.5")

    # Prepare texts with BGE retrieval prefix (matches @xenova query embedding)
    texts = [
        f"Represent this sentence for searching relevant passages: {get_text_to_embed(c)}"
        for c in concepts
    ]

    print(f"  Generating embeddings for {len(texts)} concepts...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,  # Cosine similarity = dot product after normalization
        show_progress_bar=True,
    )

    for concept, embedding in zip(concepts, embeddings):
        concept["embedding"] = embedding.tolist()  # numpy → Python list

    print(f"  [OK] Generated {len(embeddings)} embeddings (dim={embeddings.shape[1]})")
    return concepts


def main():
    json_files = list(INPUT_DIR.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {INPUT_DIR}")
        print("Run 02_extract_concepts.py and 03_validate_math.py first")
        return

    for json_path in json_files:
        print(f"\nGenerating embeddings for: {json_path.name}")
        concepts = json.loads(json_path.read_text(encoding="utf-8"))

        if not isinstance(concepts, list):
            print(f"  ⚠ Unexpected format in {json_path.name}")
            continue

        # Skip if embeddings already exist
        if all("embedding" in c for c in concepts):
            print(f"  [OK] Already has embeddings (delete to regenerate)")
            continue

        updated = generate_embeddings(concepts)
        json_path.write_text(json.dumps(updated, indent=2, ensure_ascii=False))
        print(f"  [OK] Saved: {json_path.name}")

    print("\nNext step: python 05_push_to_db.py")


if __name__ == "__main__":
    main()
