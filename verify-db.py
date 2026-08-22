import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
}

print("=== VERIFYING DATABASE STATE ===\n")

# Check products
r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,title,count=exact", headers=headers)
products_count = 0
if r.status_code == 200:
    products = r.json()
    products_count = len(products)
    print(f"✓ Products: {products_count}")
    for p in products[:6]:
        print(f"  - {p['id']}: {p['title'][:40]}")
else:
    print(f"❌ Products query failed: {r.text[:100]}")

# Check tiers
r = requests.get(f"{SUPABASE_URL}/rest/v1/product_tiers?select=*,product_id&limit=100", headers=headers)
tiers_count = 0
if r.status_code == 200:
    tiers = r.json()
    tiers_count = len(tiers)
    print(f"✓ Product Tiers: {tiers_count}")
    
    # Group by product
    product_tiers = {}
    for t in tiers:
        pid = t.get('product_id')
        if pid not in product_tiers:
            product_tiers[pid] = []
        product_tiers[pid].append(t['name'])
    
    for pid, tier_names in product_tiers.items():
        print(f"  {pid}: {', '.join(tier_names)}")
else:
    print(f"❌ Tiers query failed: {r.text[:100]}")

# Check profiles
r = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?select=user_id,email,role&count=exact", headers=headers)
profiles_count = 0
if r.status_code == 200:
    profiles = r.json()
    profiles_count = len(profiles)
    print(f"✓ Profiles: {profiles_count}")
    for p in profiles[:5]:
        print(f"  - {p['email']}: {p['role']}")
else:
    print(f"❌ Profiles query failed: {r.text[:100]}")

print(f"\n{'='*60}")
print(f"VERIFICATION SUMMARY:")
print(f"  Products: {products_count} (expected: 6)")
print(f"  Tiers: {tiers_count} (expected: 18)")
print(f"  Profiles: {profiles_count}")
print(f"{'='*60}")
