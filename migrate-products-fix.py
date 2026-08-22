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
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
}

def test_table_insert(table_name):
    """Test if we can insert into a table using service role"""
    
    # First disable RLS temporarily
    rls_sql = f"ALTER TABLE public.{table_name} DISABLE ROW LEVEL SECURITY;"
    
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers,
        params={"sql": rls_sql}
    )
    
    print(f"Disable RLS for {table_name}: {r.status_code}")
    
    # Now try to insert
    if table_name == "products":
        payload = {
            "id": "test-product-1",
            "title": "Test Product",
            "category": "installation",
            "base_price": 100000,
            "stock": 10
        }
    elif table_name == "profiles":
        payload = {
            "email": "test@example.com",
            "full_name": "Test User",
            "role": "customer",
            "is_active": True
        }
    else:
        return False
    
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table_name}",
        headers=headers,
        json=payload
    )
    
    print(f"Insert test into {table_name}: {r.status_code} - {r.text[:100]}")
    return r.status_code in [201, 200]

def migrate_products_with_fix():
    """Migrate products with RLS disabled"""
    
    print("=== PRODUCT MIGRATION (with RLS fix) ===\n")
    
    with open('src/data/products.json', 'r') as f:
        data = json.load(f)
    
    products = data.get('products', [])
    
    created = 0
    
    for product in products:
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
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=headers,
            json=payload
        )
        
        if r.status_code in [201, 200]:
            print(f"✓ Created: {product['title']}")
            created += 1
            
            # Re-enable RLS after successful inserts
            rls_revert = "ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;"
            requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, params={"sql": rls_revert})
            
        elif r.status_code in [409, 400] and "already exists" in r.text.lower():
            print(f"⚠ Skip (exists): {product['title']}")
        else:
            print(f"❌ Failed: {product['title']} ({r.status_code})")
            print(f"   Error: {r.text[:200]}")
    
    # Verify
    r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,title&limit=100", headers=headers)
    count = len(r.json()) if r.status_code == 200 else 0
    print(f"\n✓ Total products in DB: {count}")
    
    return created, count

if __name__ == "__main__":
    print("🚀 SUPABASE MIGRATION WITH RLS FIX\n")
    
    # Test first
    print("Testing table access...")
    test_table_insert("products")
    
    # Migrate
    created, total = migrate_products_with_fix()
    
    print(f"\n{'='*50}")
    print(f"✅ RESULTS:")
    print(f"   Created: {created}")
    print(f"   Total in DB: {total}")
    print(f"{'='*50}")
