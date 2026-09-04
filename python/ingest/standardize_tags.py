import os
import sys
import json
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values
from google import genai
from google.genai import types

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env.local'))

# Initialize clients
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env.local")
    sys.exit(1)

VERTEX_PROJECT = os.getenv("VERTEX_PROJECT", "student-501106")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")

client = genai.Client(
    vertexai=True,
    project=VERTEX_PROJECT,
    location=VERTEX_LOCATION,
)
MODEL = "gemini-3.6-flash"

SYSTEM_PROMPT = """You are a cognitive diagnostic engine for JEE/NEET.
Given an explanation of a student's mistake, classify it strictly into one of these 5 modes:
MODE_1_PREREQUISITE: Missing fundamental math or earlier grade physics/chemistry skills.
MODE_2_CONCEPTUAL: Flawed mental model or conceptual misunderstanding of the current topic.
MODE_3_PROCEDURAL: Procedural gap, inability to set up the problem correctly despite knowing concepts.
MODE_4_FORMULA: Used the wrong formula, wrong sign convention in formula, or mixed up variables.
MODE_5_CARELESS: Arithmetic error, calculation mistake, or dropped a negative sign during solving.
"""

def get_questions():
    """Fetch all questions with options."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT id, options FROM questions WHERE options IS NOT NULL;")
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "options": r[1]} for r in rows]

def update_questions(updates: List[tuple]):
    """Batch update questions."""
    if not updates:
        return
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    query = """
    UPDATE questions AS q
    SET options = v.options::jsonb
    FROM (VALUES %s) AS v(id, options)
    WHERE q.id = v.id::uuid;
    """
    execute_values(cur, query, updates)
    conn.commit()
    conn.close()

async def classify_batch(explanations: List[str]) -> List[str]:
    """Classify a batch of explanations concurrently using Gemini."""
    
    prompt = "Classify the following student mistakes. Output a JSON array of strings, where each string is exactly one of the 5 allowed modes (MODE_1_PREREQUISITE, MODE_2_CONCEPTUAL, MODE_3_PROCEDURAL, MODE_4_FORMULA, MODE_5_CARELESS). The output array must be exactly the same length as the input array, maintaining order.\n\nMistakes to classify:\n"
    for i, exp in enumerate(explanations):
        prompt += f"{i+1}. {exp}\n"
        
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
        )
        
        result_array = json.loads(response.text)
        if len(result_array) != len(explanations):
            print(f"Warning: Model returned {len(result_array)} items, expected {len(explanations)}. Defaulting to MODE_2_CONCEPTUAL.")
            return ["MODE_2_CONCEPTUAL"] * len(explanations)
            
        return result_array
        
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return ["MODE_2_CONCEPTUAL"] * len(explanations)

async def process_all():
    print("Fetching questions from database...")
    questions = get_questions()
    print(f"Found {len(questions)} questions.")
    
    valid_modes = {"MODE_1_PREREQUISITE", "MODE_2_CONCEPTUAL", "MODE_3_PROCEDURAL", "MODE_4_FORMULA", "MODE_5_CARELESS"}
    
    # We will build a mapping of explanation -> mode to save API calls for identical explanations
    unique_explanations = set()
    
    for q in questions:
        for opt in q["options"]:
            if not opt.get("isCorrect"):
                current_mode = opt.get("misconceptionType", "")
                if current_mode not in valid_modes:
                    exp = opt.get("explanation", "Conceptual mistake.")
                    if exp:
                        unique_explanations.add(exp)
                        
    unique_list = list(unique_explanations)
    print(f"Found {len(unique_list)} unique explanations to classify.")
    
    if not unique_list:
        print("Everything is already standardized!")
        return

    # Process in batches of 20
    BATCH_SIZE = 20
    classification_map = {}
    
    for i in range(0, len(unique_list), BATCH_SIZE):
        batch = unique_list[i:i+BATCH_SIZE]
        print(f"Classifying batch {i//BATCH_SIZE + 1} / {(len(unique_list) + BATCH_SIZE - 1) // BATCH_SIZE}...")
        
        modes = await classify_batch(batch)
        for exp, mode in zip(batch, modes):
            if mode not in valid_modes:
                mode = "MODE_2_CONCEPTUAL" # Fallback
            classification_map[exp] = mode
            
        # Slight pause to avoid rate limits
        await asyncio.sleep(1)

    print("Classification complete. Updating database records in memory...")
    
    updates = []
    for q in questions:
        changed = False
        for opt in q["options"]:
            if not opt.get("isCorrect"):
                current_mode = opt.get("misconceptionType", "")
                if current_mode not in valid_modes:
                    exp = opt.get("explanation", "Conceptual mistake.")
                    new_mode = classification_map.get(exp, "MODE_2_CONCEPTUAL")
                    opt["misconceptionType"] = new_mode
                    changed = True
        
        if changed:
            updates.append((q["id"], json.dumps(q["options"])))

    print(f"Pushing {len(updates)} updated rows to PostgreSQL...")
    update_questions(updates)
    print("Database standardization complete! 🚀")

if __name__ == "__main__":
    asyncio.run(process_all())
