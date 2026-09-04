import os
from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv("../../.env.local")

class TestResponse(BaseModel):
    items: list[str]

client = genai.Client(
    vertexai=True,
    project=os.getenv("VERTEX_PROJECT", "student-501106"),
    location=os.getenv("VERTEX_LOCATION", "global"),
)

try:
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='List 3 colors',
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TestResponse,
            temperature=0.0,
        )
    )
    print(response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
