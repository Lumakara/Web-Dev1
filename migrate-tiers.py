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
    "Prefer": "return=representation",
}

def migrate_tiers():
    print("=== MIGRATING PRODUCT TIERS ===\n")
    
    with open('src/data/products.json', 'r') as f:
        data = json.load(f)
    
    products = data.get('products', [])
    
    created = 0
    
    for product in products:
        tiers = product.get('tiers', [])
        
        if not tiers:
            continue
        
        # Get product ID from DB - use exact match
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}&select=id",
            headers=headers
        )
        
        if r.status_code != 200 or len(r.json()) == 0:
            print(f"⚠ Product not found: {product['title']}")
            continue
        
        db_product = r.json()[0]
        product_id = db_product['id']
        
        print(f"Migrating tiers for: {product['title']}")
        
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
            elif "already exists" in tr.text.lower():
                pass
            else:
                print(f"  ⚠ Tier error: {tier['name']} - {tr.status_code}")
        
        print(f"  ✓ Migrated {len(tiers)} tiers")
    
    # Verify
    r = requests.get(f"{SUPABASE_URL}/rest/v1/product_tiers?select=*&limit=500", headers=headers)
    count = len(r.json()) if r.status_code == 200 else 0
    
    print(f"\n✓ Total tiers in DB: {count}")
    return created, count

if __name__ == "__main__":
    created, total = migrate_tiers()
    print(f"\n{'='*50}")
    print(f"✅ TIERS MIGRATION COMPLETE")
    print(f"   Created: {created}")
    print(f"   Total in DB: {total}")
    print(f"{'='*50}")
