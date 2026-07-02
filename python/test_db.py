import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# Get total count of concepts
cur.execute("SELECT COUNT(*) FROM subtopics;")
count = cur.fetchone()[0]
print(f"\nSUCCESS! Found {count} total concepts inserted into NeonDB!")

# Get a single detailed example to show the schema
print("\n--- DETAILED LOOK AT A SAVED SUBTOPIC ---")
cur.execute("SELECT name, description, key_formulas, common_mistakes, pyq_frequency, raw_content FROM subtopics ORDER BY RANDOM() LIMIT 1;")
row = cur.fetchone()

if row:
    print(f"Name: {row[0]}")
    print(f"Description: {row[1]}")
    print(f"JEE Frequency: {row[4]}")
    print(f"\nKey Formulas:")
    if row[2]:
        for idx, formula in enumerate(row[2], 1):
            print(f"  {idx}. LaTeX: {formula.get('latex', 'N/A')}")
            print(f"     Description: {formula.get('description', 'N/A')}")
            print(f"     Sympy Verified: {formula.get('sympyVerified', 'N/A')}")
    else:
        print("  None")
        
    print(f"\nCommon Mistakes:")
    if row[3]:
        for mistake in row[3]:
            print(f"  - {mistake}")
    else:
        print("  None")
        
    print(f"\nRaw Content Length: {len(row[5]) if row[5] else 'NULL'}")
else:
    print("No data found!")

cur.close()
conn.close()
