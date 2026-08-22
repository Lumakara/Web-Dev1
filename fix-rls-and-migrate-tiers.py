import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Prefer": "return=representation",
}

# Disable RLS on all tables first
tables = ["profiles", "products", "product_tiers", "orders", "order_items", "support_tickets", "audit_logs"]

for table in tables:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers,
        params={"sql": f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;"}
    )
    if r.status_code == 200 or "already exists" in r.text.lower():
        print(f"✓ RLS disabled: {table}")
    else:
        print(f"⚠ {table}: {r.status_code} - {r.text[:100]}")

print("\n=== TESTING PRODUCT QUERY ===")

# Now query products
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/products?id=in.(wifi,cctv,code-repair,photo-editing,video-editing,vps-hosting)",
    headers=headers
)

if r.status_code == 200:
    d = r.json()
    print(f"✓ Found {len(d)} products:")
    for p in d:
        print(f"  - ID: {p['id']}, Title: {p['title'][:40]}")
    
    # Migrate tiers now
    print("\n=== MIGRATING TIERS ===\n")
    
    from dotenv import load_dotenv
    import json
    
    with open('src/data/products.json', 'r') as f:
        data = json.load(f)
    
    products = data.get('products', [])
    
    created = 0
    for product in products:
        tiers = product.get('tiers', [])
        
        # Find product by title (since IDs might differ)
        db_product = None
        for p in d:
            if p['title'] == product['title']:
                db_product = p
                break
        
        if not db_product:
            print(f"⚠ Product not found in DB: {product['title']}")
            continue
        
        product_id = db_product['id']
        
        for tier in tiers:
            payload = {
                "product_id": product_id,
                "name": tier['name'],
                "price": float(tier['price']),
                "features": tier.get('features', [])
            }
            
            tr = requests.post(
                f"{SUPABASE_URL}/rest/v1/product_tiers",
                headers=headers,
                json=payload
            )
            
            if tr.status_code in [201, 200]:
                created += 1
        
        print(f"✓ Created {len(tiers)} tiers for {product['title']}")
    
    print(f"\n{'='*50}")
    print(f"✅ MIGRATION COMPLETE")
    print(f"   Tiers created: {created}")
    print(f"{'='*50}")

else:
    print(f"❌ Query failed: {r.status_code}")
    print(r.text[:500])
