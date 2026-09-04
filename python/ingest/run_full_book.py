import fitz
from pathlib import Path
import sys
import os

# Add parent directory to sys.path so we can import parse_pdf_questions
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ingest.parse_pdf_questions import run_pipeline, PDF_DIR

def run_all(subject: str, start_chapter_idx: int = 1):
    pdf_map = {
        "Physics": "43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Physics.pdf",
        "Chemistry": "43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Chemistry.pdf",
        "Mathematics": "43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Mathematics.pdf"
    }
    
    filename = pdf_map.get(subject)
    if not filename:
        print(f"Unknown subject {subject}")
        return
        
    pdf_path = PDF_DIR / filename
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        return

    print(f"Scanning {subject} PDF for chapter boundaries...")
    doc = fitz.open(pdf_path)
    answer_key_pages = []
    
    for i in range(len(doc)):
        text = doc[i].get_text("text")
        # Heuristic to find Answer Key pages
        if "Answers\n" in text and "1. " in text:
            answer_key_pages.append(i)
            
    doc.close()
    
    print(f"Found {len(answer_key_pages)} chapters!")
    
    start_page = 0
    for chapter_num, ak_page in enumerate(answer_key_pages, start=1):
        if chapter_num < start_chapter_idx:
            print(f"Skipping Chapter {chapter_num} (Pages {start_page} to {ak_page})")
            start_page = ak_page + 1
            continue
            
        print(f"\n=======================================================")
        print(f"🚀 INGESTING {subject} CHAPTER {chapter_num}/{len(answer_key_pages)} (Pages {start_page} to {ak_page})")
        print(f"=======================================================")
        
        # We skip solutions from the previous chapter by letting Gemini naturally return 0 questions
        run_pipeline(subject, start_page=start_page, end_page_arg=ak_page, answer_key_page=ak_page)
        
        # Next chapter starts right after this Answer Key page
        start_page = ak_page + 1

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Auto-segment and ingest an entire PYQ book.")
    parser.add_argument("--subject", type=str, required=True, choices=["Physics", "Chemistry", "Mathematics", "All"])
    parser.add_argument("--start-subject", type=str, default=None, help="If resuming --subject All, start from this subject")
    parser.add_argument("--start-chapter", type=int, default=1, help="Chapter index to resume from (1-based)")
    args = parser.parse_args()
    
    if args.subject == "All":
        subjects = ["Physics", "Chemistry", "Mathematics"]
        if args.start_subject in subjects:
            # Skip subjects before the start_subject
            subjects = subjects[subjects.index(args.start_subject):]
            
        for idx, sub in enumerate(subjects):
            print(f"\n=======================================================")
            print(f"🚀 STARTING FULL BOOK INGESTION FOR {sub}")
            print(f"=======================================================")
            # Only apply the chapter skip to the first subject in the resumed list
            chapter_idx = args.start_chapter if idx == 0 else 1
            run_all(sub, start_chapter_idx=chapter_idx)
    else:
        run_all(args.subject, start_chapter_idx=args.start_chapter)
