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

# Get a few examples
print("\n--- A FEW RANDOM CONCEPTS FROM YOUR DATABASE ---")
cur.execute("SELECT name, description, estimated_minutes, pyq_frequency FROM subtopics ORDER BY RANDOM() LIMIT 3;")
for row in cur.fetchall():
    print(f"\nConcept: {row[0]}")
    print(f"   Description: {row[1][:100]}...")
    print(f"   JEE Frequency: {row[3]} | Est. Minutes: {row[2]}")

cur.close()
conn.close()
