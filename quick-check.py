import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
}

# Direct table count via SQL parameter (simplest query)
print("=== CHECKING PRODUCT COUNT ===\n")

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers,
    params={"sql": "SELECT COUNT(*) as cnt FROM products;"}
)

print(f"Products count request status: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"✓ Products in DB: {result[0]['cnt']}")
    
    # List them
    r2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,title",
        headers=headers
    )
    if r2.status_code == 200:
        products = r2.json()
        print(f"\nProducts:")
        for p in products:
            print(f"  - ID: {p['id']}, Title: {p['title']}")
else:
    print(f"❌ Error: {r.text[:300]}")

# Check tiers
print("\n=== CHECKING TIERS COUNT ===\n")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers,
    params={"sql": "SELECT COUNT(*) as cnt FROM product_tiers;"}
)

print(f"Tiers count request status: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"✓ Tiers in DB: {result[0]['cnt']}")
else:
    print(f"❌ Error: {r.text[:300]}")

# Check policies
print("\n=== CHECKING PROFILE POLICIES ===\n")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/",
    headers=headers,
    params={"sql": "SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';"}
)

if r.status_code == 200:
    policies = r.json()
    print(f"Profiles policies ({len(policies)}):")
    for p in policies:
        print(f"  - {p['policyname']}")
else:
    print(f"❌ Error: {r.text[:300]}")
