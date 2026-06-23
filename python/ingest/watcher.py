#!/usr/bin/env python3
"""
watcher.py — Auto-trigger ingestion pipeline when new PDF appears in input_pdfs/.

Uses watchdog to monitor the input_pdfs/ directory.
When a new PDF is detected, runs steps 01→05 automatically.

Usage:
    python watcher.py --topic-id UUID

Press Ctrl+C to stop.
"""

import sys
import time
import subprocess
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

INPUT_DIR = Path(__file__).parent.parent / "data" / "input_pdfs"
SCRIPT_DIR = Path(__file__).parent


def run_pipeline(pdf_path: Path, topic_id: str) -> None:
    """Run the full ingestion pipeline for a single PDF."""
    pdf_name = pdf_path.stem
    print(f"\n{'='*60}")
    print(f"New PDF detected: {pdf_path.name}")
    print(f"{'='*60}")

    steps = [
        ([sys.executable, "01_pdf_to_markdown.py", "--pdf", str(pdf_path)], "PDF → Markdown"),
        ([sys.executable, "02_extract_concepts.py", "--file", f"{pdf_name}.md"], "Extract concepts"),
        ([sys.executable, "03_validate_math.py"], "Validate math"),
        ([sys.executable, "04_generate_embeddings.py"], "Generate embeddings"),
        ([sys.executable, "05_push_to_db.py", "--topic-id", topic_id, "--file", f"{pdf_name}.json"], "Push to DB"),
    ]

    for cmd, label in steps:
        print(f"\n[{label}]")
        result = subprocess.run(cmd, cwd=SCRIPT_DIR)
        if result.returncode != 0:
            print(f"ERROR: Step '{label}' failed. Pipeline stopped.")
            print("Fix the error and re-run manually.")
            return

    print(f"\n[OK] Pipeline complete for {pdf_path.name}")


def main():
    parser = argparse.ArgumentParser(description="Watch for new PDFs and auto-ingest")
    parser.add_argument("--topic-id", required=True, help="UUID of the parent topic in DB")
    args = parser.parse_args()

    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError:
        print("ERROR: watchdog not installed. Run: pip install watchdog")
        sys.exit(1)

    class PDFHandler(FileSystemEventHandler):
        def on_created(self, event):
            if not event.is_directory and event.src_path.endswith(".pdf"):
                pdf_path = Path(event.src_path)
                # Small delay to ensure file is fully written
                time.sleep(2)
                run_pipeline(pdf_path, args.topic_id)

    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    observer = Observer()
    observer.schedule(PDFHandler(), str(INPUT_DIR), recursive=False)
    observer.start()

    print(f"Watching for new PDFs in: {INPUT_DIR}")
    print(f"Topic ID: {args.topic_id}")
    print("Press Ctrl+C to stop\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()


if __name__ == "__main__":
    main()
