import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
}

# Get all products
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/products?id=in.(wifi,cctv,code-repair,photo-editing,video-editing,vps-hosting)",
    headers=headers
)

print(f"Status: {r.status_code}")
if r.status_code == 200:
    d = r.json()
    print(f"Found {len(d)} products:")
    for p in d:
        print(f"  - ID: {p['id']}")
else:
    print(r.text[:500])
