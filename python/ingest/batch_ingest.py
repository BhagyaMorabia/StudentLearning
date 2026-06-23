#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

INPUT_DIR = Path(__file__).parent.parent / "data" / "input_pdfs"
SCRIPT_DIR = Path(__file__).parent
NEXT_APP_DIR = Path(__file__).parent.parent.parent

def parse_filename(filepath: Path):
    stem = filepath.stem.replace('-min', '') 
    
    if stem.startswith('lech'):
        subject = "Chemistry"
    elif stem.startswith('lemh'):
        subject = "Mathematics"
    elif stem.startswith('leph'):
        subject = "Physics"
    else:
        folder = filepath.parent.name.lower()
        if folder == 'chemistry': subject = "Chemistry"
        elif folder == 'maths': subject = "Mathematics"
        elif folder == 'physics': subject = "Physics"
        else: subject = "Unknown"
        
    try:
        if stem.startswith(('lech','lemh','leph')) and len(stem) >= 5:
            class_indicator = stem[4]
            class_year = 11 if class_indicator == '1' else 12 if class_indicator == '2' else 11
            
            chapter_str = stem[5:]
            if chapter_str.isdigit():
                chapter_num = int(chapter_str)
            else:
                if chapter_str == 'an': chapter_num = 98
                elif chapter_str == 'ps': chapter_num = 99
                else: chapter_num = 90
        else:
            class_year = 11
            chapter_num = 1
    except:
        class_year = 11
        chapter_num = 1
        
    return subject, class_year, chapter_num

def get_topic_id(subject, class_year, chapter_num):
    # Call the TS script to ensure db rows exist and return the Topic UUID
    cmd = ["npx", "tsx", "src/lib/db/getOrCreateTopic.ts", subject, str(class_year), str(chapter_num)]
    # Use shell=True on Windows if npx is not resolved directly, but usually subprocess handles it.
    # To be safe on windows, we can pass shell=True or use 'npx.cmd'.
    use_shell = os.name == 'nt'
    result = subprocess.run(cmd, cwd=NEXT_APP_DIR, capture_output=True, text=True, shell=use_shell)
    if result.returncode != 0:
        print(f"Error getting topic ID:\n{result.stderr}")
        return None
    # the script prints the UUID as the last line
    lines = result.stdout.strip().split('\n')
    return lines[-1].strip()

def run_pipeline(pdf_path: Path, topic_id: str) -> bool:
    pdf_name = pdf_path.stem
    print(f"\n{'='*60}")
    print(f"Processing PDF: {pdf_path.name} -> Topic: {topic_id}")
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
            print(f"ERROR: Step '{label}' failed for {pdf_name}.")
            return False

    print(f"\n✓ Pipeline complete for {pdf_path.name}")
    return True

def main():
    pdfs = list(INPUT_DIR.rglob("*.pdf"))
    if not pdfs:
        print("No PDFs found in", INPUT_DIR)
        return

    print(f"Found {len(pdfs)} PDFs to process.")
    for pdf in pdfs:
        subject, class_year, chapter_num = parse_filename(pdf)
        print(f"\n--- Next File: {pdf.name} ---")
        print(f"Parsed as: {subject} | Class {class_year} | Chapter {chapter_num}")
        
        topic_id = get_topic_id(subject, class_year, chapter_num)
        if not topic_id:
            print(f"Failed to get topic ID for {pdf.name}, skipping.")
            continue
            
        success = run_pipeline(pdf, topic_id)
        if not success:
            print(f"Pipeline failed for {pdf.name}. Moving to next.")

if __name__ == "__main__":
    main()
