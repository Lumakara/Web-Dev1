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

def migrate_products():
    print("=== PRODUCT DATA MIGRATION ===\n")
    
    # Load products.json
    with open('src/data/products.json', 'r') as f:
        data = json.load(f)
    
    products = data.get('products', [])
    print(f"Found {len(products)} products in source file\n")
    
    created = 0
    updated = 0
    
    for product in products:
        tiers = product.get('tiers', [])
        
        # Insert product without tiers first
        payload = {
            "id": product['id'],
            "title": product['title'],
            "category": product['category'],
            "base_price": float(product['base_price']),
            "discount_price": float(product['discount_price']) if product.get('discount_price') else None,
            "stock": product.get('stock', 0),
            "image": product.get('image', ''),
            "icon": product.get('icon', ''),
            "rating": float(product.get('rating', 4.5)),
            "reviews": int(product.get('reviews', 0)),
            "duration": product.get('duration', ''),
            "description": product.get('description', ''),
            "tags": product.get('tags', []),
            "related": product.get('related', []),
        }
        
        # Try to insert product
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=headers,
            json=payload
        )
        
        if r.status_code == 201:
            print(f"✓ Created product: {product['title']}")
            created += 1
            
            # Insert tiers
            tier_product_id = r.json().get('id')
            for t in tiers:
                tier_payload = {
                    "product_id": tier_product_id,
                    "name": t['name'],
                    "price": float(t['price']),
                    "features": t.get('features', [])
                }
                
                tr = requests.post(
                    f"{SUPABASE_URL}/rest/v1/product_tiers",
                    headers=headers,
                    json=tier_payload
                )
                if tr.status_code not in [201, 409]:
                    print(f"  ⚠ Tier error: {t['name']} - {tr.status_code}")
                    
        elif r.status_code == 409 or "already exists" in r.text.lower():
            print(f"⚠ Product exists: {product['title']}")
            updated += 1
        else:
            print(f"❌ Product creation failed: {product['title']} ({r.status_code})")
    
    # Verify migrated products
    r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,title,category&limit=100", headers=headers)
    products_db_count = 0
    if r.status_code == 200:
        products_db = r.json()
        products_db_count = len(products_db)
        print(f"\n✓ Verified {products_db_count} products in database")
        
        # Count tiers
        tiers_r = requests.get(f"{SUPABASE_URL}/rest/v1/product_tiers?select=*&limit=500", headers=headers)
        if tiers_r.status_code == 200:
            tiers_db = tiers_r.json()
            print(f"✓ Verified {len(tiers_db)} product tiers in database")
            
            # Show sample tiers
            tier_sample = tiers_db[:3]
            print(f"\nSample tiers:")
            for tier in tier_sample:
                print(f"  - {tier['name']}: Rp {int(tier['price']):,}")
    
    return created, updated, products_db_count

if __name__ == "__main__":
    print("🚀 SUPABASE PRODUCT MIGRATION\n")
    
    created, updated, total = migrate_products()
    
    print(f"\n{'='*50}")
    print(f"✅ MIGRATION SUMMARY:")
    print(f"   Products created: {created}")
    print(f"   Products updated (skip): {updated}")
    print(f"   Total products in DB: {total}")
    print(f"{'='*50}")
