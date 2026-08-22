import os
import requests
from dotenv import load_dotenv
import json

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Load and check products.json structure
with open('src/data/products.json', 'r') as f:
    data = json.load(f)
    
print("Products JSON structure:", type(data), list(data.keys()) if isinstance(data, dict) else "list")
if isinstance(data, dict):
    first_key = list(data.keys())[0]
    print(f"First product sample:")
    sample = data[first_key][0] if isinstance(data[first_key], list) else data[first_key]
    print(json.dumps(sample, indent=2)[:500])
