import google.auth
from google.auth.transport.requests import Request
import requests
import json

PROJECT_ID = 'project-4e272d6a-f5a1-4799-aa9'
LOCATION = 'us-central1'

credentials, project = google.auth.default()
credentials.refresh(Request())

url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models"

headers = {
    "Authorization": f"Bearer {credentials.token}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
if response.status_code == 200:
    models = response.json().get('models', [])
    for m in models:
        print(m['name'].split('/')[-1])
else:
    print(f"Error: {response.status_code}")
    print(response.text)
