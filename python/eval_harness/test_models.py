import os
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel
import vertexai

PROJECT_ID = 'project-4e272d6a-f5a1-4799-aa9'
REGIONS = ['us-central1', 'global']
MODELS = [
    'gemini-1.5-flash-002', 
    'gemini-1.5-flash-001', 
    'gemini-1.5-flash',
    'gemini-1.0-pro-002',
    'gemini-1.0-pro-001',
    'gemini-1.0-pro',
    'gemini-pro'
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
                    print(f'[404 NOT FOUND] {model_name}')
                elif '403' in err_msg:
                    print(f'[403 NO ACCESS] {model_name}')
                else:
                    print(f'[FAIL] {model_name} - {err_msg}')
    except Exception as e:
        print(f'Failed to init {region}: {e}')
