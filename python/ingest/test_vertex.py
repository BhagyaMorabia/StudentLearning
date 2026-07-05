"""Test Vertex AI by generating enough tokens to show up in billing (approx Rs 10-15)."""
from google import genai
import time

client = genai.Client(
    vertexai=True,
    project="student-501106",
    location="global",
)

print("Starting token burn to verify billing...")
print("This will generate about 25,000 tokens (approx Rs 10-15).")

total_tokens = 0

for i in range(1, 4):
    try:
        print(f"\n[Call {i}/10] Requesting a long essay...")
        response = client.models.generate_content(
            model="gemini-3.1-pro-preview",
            contents="Write a highly detailed, comprehensive, 2000-word essay about the history of quantum mechanics. Include formulas, key figures, and paradigm shifts.",
        )
        
        usage = response.usage_metadata
        total = getattr(usage, 'total_token_count', 0)
        
        total_tokens += total
        print(f"  -> Generated! Call tokens: {total}")
        print(f"  -> Running Total: {total_tokens} tokens")
        
        # Sleep briefly to avoid aggressive rate limits
        time.sleep(2)
        
    except Exception as e:
        print(f"  [X] Failed on call {i}: {str(e)}")
        break

print(f"\n=========================================")
print(f"FINISHED. Total tokens generated: {total_tokens}")
print(f"Estimated cost: ~Rs {total_tokens * 0.0004:.2f}")
print(f"=========================================")
print("Check your Google Cloud Billing -> Reports (filtered by Vertex AI) in a few hours.")
