"""Execute Supabase migrations and migrate data."""

import os
import json
import requests
from datetime import datetime

SUPABASE_URL = os.environ['SUPABASE_URL']
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

def execute_sql(sql_text):
    """Execute raw SQL via Supabase database API."""
    print(f"Executing SQL ({len(sql_text)} chars)...")
    
    # Use the rpc/execute endpoint for raw SQL
    response = requests.post(
        f'{SUPABASE_URL}/rpc/execute_sql',
        headers={**HEADERS},
        json={'sql': sql_text},
        timeout=60
    )
    
    if response.status_code == 200:
        result = response.json()
        if 'rows' in result or not result:
            print("✓ SQL executed successfully")
            return True
        else:
            print(f"✗ Error: {result}")
            return False
    else:
        print(f"✗ HTTP {response.status_code}: {response.text[:200]}")
        return False

def create_supabase_user(email, password, full_name, role):
    """Create user via Supabase Auth admin API."""
    url = f'{SUPABASE_URL}/auth/v1/admin/users'
    payload = {
        'email': email,
        'password': password,
        'user_metadata': {
            'full_name': full_name,
            'role': role
        }
    }
    
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code in [200, 201]:
        user_data = response.json()
        user_id = user_data.get('id')
        print(f"✓ User created: {email} (ID: {user_id})")
        return user_id
    elif 'already exists' in str(response.text).lower():
        print(f"• User already exists: {email}")
        list_response = requests.get(
            f'{url}?email_eq={email}',
            headers=HEADERS
        )
        if list_response.status_code == 200:
            users = list_response.json()
            if users:
                return users[0].get('id')
    else:
        error_msg = response.text[:200]
        print(f"✗ Failed to create user {email}: {error_msg}")
    return None

def insert_table(table_name, payload):
    """Insert record into Supabase table."""
    url = f'{SUPABASE_URL}/rest/v1/{table_name}'
    response = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    
    if response.status_code in [200, 201, 204]:
        print(f"✓ Inserted into {table_name}")
        return True
    else:
        print(f"✗ Failed to insert into {table_name}: {response.text[:200]}")
        return False

def main():
    print("=" * 60)
    print("SUPABASE MIGRATION SCRIPT")
    print("=" * 60)
    
    # Read and execute migration files
    print("\n=== EXECUTING MIGRATIONS ===")
    migrations = [
        '/root/Web-Dev1/supabase/migrations/001_core_schema.sql',
        '/root/Web-Dev1/supabase/migrations/002_payment_tables.sql'
    ]
    
    success_count = 0
    for migration in migrations:
        with open(migration, 'r') as f:
            sql = f.read()
        
        # Split by semicolons and execute each statement
        statements = [s.strip() + ';' for s in sql.split(';') if s.strip()]
        
        for stmt in statements:
            if stmt.upper().strip().startswith('CREATE TABLE'):
                continue  # Skip CREATE TABLE - will run whole file
            elif stmt.upper().strip().startswith('--') or not stmt.strip():
                continue
            
            result = execute_sql(stmt)
            if result:
                success_count += 1
    
    # Execute entire migration files as-is
    print("\nRunning full migration files...")
    for migration in migrations:
        print(f"\n{migration}")
        with open(migration, 'r') as f:
            sql = f.read()
        
        # Try different endpoints
        endpoints_to_try = [
            '/rpc/run_sql',
            '/rest/v1/'
        ]
        
        for endpoint in endpoints_to_try:
            response = requests.post(
                f'{SUPABASE_URL}{endpoint}',
                headers={**HEADERS, 'Prefer': 'return=representation'},
                json={'sql': sql},
                timeout=60
            )
            
            if response.status_code == 200 and ('rows' in response.json() or response.json() is None):
                print("✓ Full migration executed")
                break
            elif response.status_code != 404:
                print(f"Endpoint {endpoint}: {response.status_code}")
    
    # Migrate admins
    print("\n=== MIGRATING ADMINS ===")
    with open('/root/Web-Dev1/src/data/admins.json', 'r') as f:
        data = json.load(f)
    
    admins = data.get('admins', [])
    migrated_admins = 0
    
    for admin in admins:
        print(f"\nProcessing: {admin['email']} ({admin['name']})")
        
        user_id = create_supabase_user(
            admin['email'],
            admin['password'],
            admin['name'],
            admin['role']
        )
        
        if user_id:
            profile_payload = {
                'user_id': user_id,
                'email': admin['email'],
                'full_name': admin['name'],
                'role': admin['role'],
                'is_active': admin.get('isActive', True)
            }
            
            if insert_table('profiles', profile_payload):
                migrated_admins += 1
    
    # Migrate products
    print("\n=== MIGRATING PRODUCTS ===")
    with open('/root/Web-Dev1/src/data/products.json', 'r') as f:
        prod_data = json.load(f)
    
    # Handle both dict and list structures
    if isinstance(prod_data, dict):
        products = prod_data.get('products', [])
    else:
        products = prod_data if isinstance(prod_data, list) else []
    
    print(f"Found {len(products)} products")
    migrated_products = 0
    
    for product in products:
        try:
            product_payload = {
                'id': product.get('id', f'prod-{datetime.now().timestamp()}'),
                'title': product.get('title', ''),
                'category': product.get('category', 'installation'),
                'base_price': str(product.get('base_price', 0)),
                'discount_price': str(product.get('discount_price')) if product.get('discount_price') else None,
                'stock': product.get('stock', 0),
                'image': product.get('image', ''),
                'icon': product.get('icon', ''),
                'rating': product.get('rating', 4.5),
                'reviews': product.get('reviews', 0),
                'duration': product.get('duration', ''),
                'description': product.get('description', ''),
                'tags': product.get('tags', []),
                'related': product.get('related', []),
            }
            
            if insert_table('products', product_payload):
                migrated_products += 1
                
                # Insert tiers
                tiers = product.get('tiers', [])
                if tiers:
                    for tier in tiers:
                        tier_payload = {
                            'product_id': product_payload['id'],
                            'name': tier.get('name', ''),
                            'price': str(tier.get('price', 0)),
                            'features': tier.get('features', [])
                        }
                        insert_table('product_tiers', tier_payload)
                        
        except Exception as e:
            print(f"✗ Error processing product: {e}")
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print(f"  - Admins migrated: {migrated_admins}/{len(admins)}")
    print(f"  - Products migrated: {migrated_products}/{len(products)}")
    print("=" * 60)

if __name__ == '__main__':
    main()
