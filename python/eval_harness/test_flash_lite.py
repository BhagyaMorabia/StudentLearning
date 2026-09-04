import os
from vertexai.generative_models import GenerativeModel
import vertexai

PROJECT_ID = 'project-4e272d6a-f5a1-4799-aa9'
# The user's screenshot shows Agent Platform, which might default to us-central1 or global
REGIONS = ['us-central1', 'global']
MODELS = [
    'gemini-3.5-flash-lite', 
    'gemini-3.5-flash-lite-preview', 
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview'
]

for region in REGIONS:
    print(f'\n--- Testing Region: {region} ---')
    try:
        vertexai.init(project=PROJECT_ID, location=region)
        for model_name in MODELS:
            try:
                model = GenerativeModel(model_name)
                # Quick count tokens to verify access
                model.count_tokens('hello')
                print(f'[SUCCESS] {model_name} in {region}')
            except Exception as e:
                err_msg = str(e).split('\n')[0][:100]
                if '404' in err_msg:
                    pass # Hide 404s to keep output clean
                else:
                    print(f'[FAIL] {model_name} - {err_msg}')
    except Exception as e:
        print(f'Failed to init {region}: {e}')
