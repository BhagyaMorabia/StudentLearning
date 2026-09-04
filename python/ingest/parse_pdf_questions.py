import time
import os
import sys
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv
import fitz  # PyMuPDF
from google import genai
from google.genai import types
from google.genai.errors import APIError
import psycopg2
from psycopg2.extras import Json

ENV_PATH = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(ENV_PATH)

VERTEX_PROJECT = os.getenv("VERTEX_PROJECT", "student-501106")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")
DATABASE_URL = os.getenv("PYTHON_DATABASE_URL") or os.getenv("DATABASE_URL")

MODEL = "gemini-3.6-flash"

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env.local")
    sys.exit(1)

client = genai.Client(
    vertexai=True,
    project=VERTEX_PROJECT,
    location=VERTEX_LOCATION,
)

PDF_DIR = Path(__file__).parent.parent / "data" / "PYQ Questions"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "extracted_pyqs"
DIAGRAMS_DIR = Path(__file__).parent.parent.parent / "public" / "diagrams"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

NAMESPACE_JEE = uuid.uuid5(uuid.NAMESPACE_DNS, "jee.neuraljee.com")

def get_subtopics_for_subject(conn, subject_name: str) -> list:
    cur = conn.cursor()
    cur.execute("""
        SELECT s.id, s.name, t.name as topic_name, c.name as chapter_name
        FROM subtopics s
        JOIN topics t ON s.topic_id = t.id
        JOIN chapters c ON t.chapter_id = c.id
        JOIN subjects sub ON c.subject_id = sub.id
        WHERE sub.name = %s
    """, (subject_name,))
    
    subtopics = []
    for row in cur.fetchall():
        subtopics.append({
            "id": row[0],
            "name": row[1],
            "topic": row[2],
            "chapter": row[3]
        })
    cur.close()
    return subtopics


def crop_and_save_diagram(pdf_doc, page_num, bounding_box, out_path):
    """Crop bounding box with 5% padding and save to disk."""
    if not bounding_box or len(bounding_box) != 4:
        return None
        
    page = pdf_doc[page_num]
    ymin, xmin, ymax, xmax = bounding_box
    
    # If the bounding box is essentially zero-sized, ignore it
    if (xmax - xmin) < 1 or (ymax - ymin) < 1:
        return None
    
    x0 = (xmin / 1000) * page.rect.width
    y0 = (ymin / 1000) * page.rect.height
    x1 = (xmax / 1000) * page.rect.width
    y1 = (ymax / 1000) * page.rect.height
    
    width = x1 - x0
    height = y1 - y0
    pad_x = width * 0.05
    pad_y = height * 0.05
    
    crop_rect = fitz.Rect(
        max(0, x0 - pad_x),
        max(0, y0 - pad_y),
        min(page.rect.width, x1 + pad_x),
        min(page.rect.height, y1 + pad_y)
    )
    
    # Ensure crop_rect has valid dimensions before calling get_pixmap
    if crop_rect.width <= 0 or crop_rect.height <= 0:
        return None
        
    pix = page.get_pixmap(clip=crop_rect, dpi=300)
    pix.save(str(out_path))
    return f"/diagrams/{out_path.name}"

def extract_answer_key_json(pdf_path: Path, page_num: int) -> dict:
    print(f"Extracting 1-shot Answer Key JSON from page {page_num}...")
    doc = fitz.open(pdf_path)
    chunk_pdf = fitz.open()
    chunk_pdf.insert_pdf(doc, from_page=page_num, to_page=page_num)
    pdf_bytes = chunk_pdf.write()
    chunk_pdf.close()
    doc.close()
    
    system_instruction = """You are a FAANG-level data extraction engineer.
Your task is to read the Answer Key page from a JEE PYQ book and convert it into a structured JSON dictionary.
The dictionary should map Section Names to their respective Answer Keys.
Keys should be the exact section names as written on the page (e.g. "Section 1", "Section 2").
Values should be objects mapping question numbers (as strings) to the correct option(s) (as strings).

CRITICAL JSON REQUIREMENT: 
You MUST double-escape all backslashes in your mathematical expressions so the output is strictly valid JSON. 
For example, instead of writing "\\sqrt", you must write "\\\\sqrt". Do NOT return invalid JSON escape sequences.
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf'),
                    "Extract the Answer Key JSON."
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except json.decoder.JSONDecodeError as e:
            print(f"JSON Decode Error on Answer Key (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                print("Failed to extract Answer Key JSON cleanly. Returning empty dictionary.")
                return {}
        except Exception as e:
            print(f"Error extracting Answer Key (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                return {}


def process_pdf_chunk(pdf_path: Path, start_page: int, end_page: int, subject_subtopics: list, answer_key_json: dict = None):
    """Extract questions from a 3-page chunk using the sliding window rule, optionally grounded by an Answer Key."""
    print(f"Processing pages {start_page} to {end_page}...")
    doc = fitz.open(pdf_path)
    
    chunk_pdf = fitz.open()
    chunk_pdf.insert_pdf(doc, from_page=start_page, to_page=end_page)
    pdf_bytes = chunk_pdf.write()
    chunk_pdf.close()

    subtopics_json = json.dumps(subject_subtopics, indent=2)
    
    system_instruction = f"""You are a FAANG-level data extraction engineer specializing in JEE examinations.
You are given a {end_page - start_page + 1}-page chunk from a 43-year JEE PYQ book.

For each valid question, extract:
1. questionText in strict LaTeX.
2. The correct answer and step-by-step mathematical solution.
3. Why each of the 4 options is right/wrong (the 'explanation').
4. The 'prerequisiteTrapId'. If a wrong option is a conceptual trap, map it to a UUID below. Else, null.
5. If the question has a physical diagram, return bounding box [ymin, xmin, ymax, xmax] scaled 0 to 1000. Else null.
6. For graphical options (e.g. 4 different graphs as A, B, C, D), set text to null and provide optionBoundingBox [ymin, xmin, ymax, xmax] scaled 0 to 1000.
"""

    if answer_key_json:
        system_instruction += f"""
GROUND TRUTH VERIFICATION:
You are provided with the official verified Answer Key for this chapter:
{json.dumps(answer_key_json, indent=2)}

For every question you extract:
1. Determine its section and question number.
2. Match it to the exact entry in the provided Answer Key JSON.
3. Set `isCorrect: true` ONLY for the option matching the official answer.
4. Derive the `solutionText` step-by-step to arrive at this exact official answer.
5. If the Answer Key provides a multiple-choice letter (e.g., 'b' or 'a,c'), tag the corresponding options as correct. If the Answer Key provides a mathematical expression or subjective text, you must evaluate mathematical equivalence to determine the correct option, or embed the exact expression into the solution derivation for integer-type questions.
"""

    system_instruction += f"""
AVAILABLE SUBTOPICS:
{subtopics_json}
"""

    prompt = "Extract all questions from this chunk."

    max_retries = 3
    retry_delay = 15

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf'),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "questions": {
                                "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "subtopicId": {"type": "STRING"},
                                    "questionText": {"type": "STRING"},
                                    "solutionText": {"type": "STRING"},
                                    "year": {"type": "INTEGER"},
                                    "examType": {"type": "STRING"},
                                    "pageIndex": {"type": "INTEGER"},
                                    "diagramBoundingBox": {
                                        "type": "ARRAY",
                                        "items": {"type": "NUMBER"},
                                        "nullable": True
                                    },
                                    "options": {
                                        "type": "ARRAY",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "id": {"type": "STRING"},
                                                "text": {"type": "STRING", "nullable": True},
                                                "optionBoundingBox": {
                                                    "type": "ARRAY",
                                                    "items": {"type": "NUMBER"},
                                                    "nullable": True
                                                },
                                                "isCorrect": {"type": "BOOLEAN"},
                                                "explanation": {"type": "STRING"},
                                                "prerequisiteTrapId": {"type": "STRING", "nullable": True},
                                                "misconceptionType": {"type": "STRING"}
                                            },
                                            "required": ["id", "isCorrect", "explanation", "misconceptionType"]
                                        }
                                    }
                                },
                                "required": ["subtopicId", "questionText", "solutionText", "options", "year", "examType", "pageIndex"]
                            }
                        }
                    },
                    "required": ["questions"]
                }
            )
        )
            print("Gemini Response Text:")
            print(response.text)
            parsed = json.loads(response.text)
            
            # Hydrate images and save to DB
            return hydrate_and_upsert(parsed.get("questions", []), doc, start_page)
            
        except APIError as e:
            print(f"API Error (Attempt {attempt+1}/{max_retries}): {e}")
            if e.code == 429:
                print(f"Rate limit hit. Sleeping for {retry_delay} seconds...")
            else:
                print(f"Other API Error. Sleeping for {retry_delay} seconds...")
            time.sleep(retry_delay)
        except Exception as e:
            print(f"Network/Unexpected ERROR (Attempt {attempt+1}/{max_retries}): {e}")
            print(f"Sleeping for {retry_delay} seconds before retrying...")
            time.sleep(retry_delay)
            
    print(f"Failed to process pages {start_page}-{end_page} after {max_retries} attempts.")
    return 0

def hydrate_and_upsert(questions, pdf_doc, start_page_offset):
    """Crop images, generate UUIDs, and upsert to Postgres."""
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    cur = conn.cursor()
    
    saved_count = 0
    for q in questions:
        # Generate idempotent UUID based on question text
        q_uuid = str(uuid.uuid5(NAMESPACE_JEE, q["questionText"][:100].strip()))
        page_num = start_page_offset + q["pageIndex"]
        
        # Crop main diagram if exists
        image_url = None
        if q.get("diagramBoundingBox"):
            out_path = DIAGRAMS_DIR / f"pyq_{q_uuid}.png"
            image_url = crop_and_save_diagram(pdf_doc, page_num, q["diagramBoundingBox"], out_path)
            
        # Format options and crop graphical options
        formatted_options = []
        correct_answer = None
        
        for opt in q["options"]:
            opt_data = {
                "id": opt["id"],
                "text": opt.get("text"),
                "isCorrect": opt["isCorrect"],
                "explanation": opt["explanation"],
                "prerequisiteTrapId": opt.get("prerequisiteTrapId"),
                "misconceptionType": opt["misconceptionType"]
            }
            if opt.get("optionBoundingBox"):
                opt_out = DIAGRAMS_DIR / f"pyq_{q_uuid}_opt{opt['id']}.png"
                opt_url = crop_and_save_diagram(pdf_doc, page_num, opt["optionBoundingBox"], opt_out)
                opt_data["imageUrl"] = opt_url
                
            formatted_options.append(opt_data)
            if opt["isCorrect"]:
                correct_answer = {"value": opt["id"]}
                
        if not correct_answer:
            correct_answer = {"value": "A"} # Fallback, should not happen

        try:
            # Upsert into Postgres
            cur.execute("""
                INSERT INTO questions (
                    id, subtopic_id, question_text, question_type, 
                    options, correct_answer, solution_steps, 
                    year_appeared, source, status
                ) VALUES (
                    %s, %s, %s, %s, 
                    %s, %s, %s, 
                    %s, %s, %s
                ) ON CONFLICT (id) DO UPDATE SET
                    options = EXCLUDED.options,
                    solution_steps = EXCLUDED.solution_steps
            """, (
                q_uuid,
                q["subtopicId"],
                q["questionText"],
                "MCQ", # Assume MCQ for now
                Json(formatted_options),
                Json(correct_answer),
                Json([{"step": 1, "explanation": q["solutionText"], "math": "..."}]),
                q["year"],
                "NTA_PYQ",
                "VERIFIED"
            ))
            saved_count += 1
        except Exception as e:
            print(f"DB Error for question {q_uuid}: {e}")
            conn.rollback()
            continue

    conn.commit()
    cur.close()
    conn.close()
    return saved_count

import argparse

def run_pipeline(subject: str, start_page: int, end_page_arg: int = None, answer_key_page: int = None):
    conn = psycopg2.connect(DATABASE_URL)
    subtopics = get_subtopics_for_subject(conn, subject)
    conn.close()
    
    # Map subject to filename
    pdf_map = {
        "Physics": "43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Physics.pdf",
        "Chemistry": "43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Chemistry.pdf",
        "Mathematics": "43_Years_Chapterwise_Topicwise_Solved_Papers_2021_1979_IIT_JEE_Mathematics.pdf"
    }
    
    filename = pdf_map.get(subject)
    if not filename:
        print(f"ERROR: Unknown subject {subject}")
        sys.exit(1)
        
    pdf_path = PDF_DIR / filename
    
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)
        
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    doc.close()
    
    final_page = end_page_arg if end_page_arg is not None else total_pages - 1
        
    print(f"Loaded {len(subtopics)} {subject} subtopics for context.")
    
    answer_key_json = None
    if answer_key_page is not None:
        answer_key_json = extract_answer_key_json(pdf_path, answer_key_page)
        print("Answer Key extracted successfully. Injecting into sliding window...")
        
    print(f"Starting Sliding Window Ingestion from page {start_page} to {final_page}...")
    
    total_saved = 0
    # Sliding window of 3 pages (0-2, 2-4, 4-6, etc.)
    for current_start in range(start_page, final_page, 2):
        current_end = min(current_start + 2, final_page)
        
        # If the window is less than 2 pages, we still process it
        saved = process_pdf_chunk(pdf_path, current_start, current_end, subtopics, answer_key_json)
        total_saved += saved
        print(f"Saved {saved} questions from window {current_start}-{current_end}.")
        
        # Rate limit safety between successful chunks just in case
        time.sleep(2)
        
    print(f"Pipeline complete! {total_saved} total questions upserted for {subject}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest JEE PYQs from PDF using Gemini.")
    parser.add_argument("--subject", type=str, required=True, choices=["Physics", "Chemistry", "Mathematics"], help="The subject to ingest (Physics, Chemistry, Mathematics)")
    parser.add_argument("--start-page", type=int, default=20, help="The page index to start from (0-indexed). Usually 20 to skip index/preface.")
    parser.add_argument("--end-page", type=int, default=None, help="The page index to end at (inclusive). Defaults to end of PDF.")
    parser.add_argument("--answer-key-page", type=int, default=None, help="The page index of the answer key for this chapter.")
    
    args = parser.parse_args()
    run_pipeline(args.subject, args.start_page, args.end_page, args.answer_key_page)
