"""Execute migrations via Supabase's direct SQL execution endpoint."""
import os
import json
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def run_migrations():
    """Run SQL migrations using Supabase database API."""
    
    # Use the correct endpoint for raw SQL execution
    # Supabase provides /rpc/run_sql for this purpose
    url = f"{SUPABASE_URL}/rpc/run_sql"
    
    print("="*60)
    print("EXECUTING SUPABASE MIGRATIONS")
    print("="*60)
    
    migrations_dir = "/root/Web-Dev1/supabase/migrations"
    
    for filename in sorted(os.listdir(migrations_dir)):
        if not filename.endswith('.sql'):
            continue
            
        filepath = os.path.join(migrations_dir, filename)
        
        print(f"\n📄 Running: {filename}")
        print("-"*40)
        
        with open(filepath, 'r') as f:
            sql = f.read()
        
        # Execute SQL
        response = requests.post(url, headers=HEADERS, json={'sql': sql}, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            rows = result.get('rows', [])
            print(f"✅ Success - Executed {len(sql)} chars")
            if rows:
                print(f"   Rows affected/returned: {len(rows)}")
        else:
            error_text = response.text[:300]
            print(f"❌ Failed ({response.status_code})")
            print(f"   Error: {error_text}")
    
    print("\n" + "="*60)
    print("MIGRATION EXECUTION COMPLETE")
    print("="*60)
    
    # Verify tables were created
    print("\nVerifying tables...")
    
    verify_url = f"{SUPABASE_URL}/rest/v1/"
    
    tables_to_check = ['profiles', 'products', 'product_tiers', 'orders', 
                       'support_tickets', 'audit_logs', 'payments', 'payment_events']
    
    for table in tables_to_check:
        check_headers = HEADERS.copy()
        check_headers['select'] = '*'
        
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/{table}',
            headers={**HEADERS, 'Prefer': 'count=exact'},
            timeout=10
        )
        
        if response.status_code in [200, 204]:
            print(f"  ✅ {table}: EXISTS")
        else:
            print(f"  ❌ {table}: NOT FOUND (HTTP {response.status_code})")
    
    print("\n" + "="*60)

if __name__ == '__main__':
    try:
        run_migrations()
    except Exception as e:
        print(f"Critical error: {e}")
        import traceback
        traceback.print_exc()
