import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

def execute_sql(sql_query):
    """Execute SQL using Supabase HTTP API with correct method"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Use the rpc endpoint or direct sql parameter in GET
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers,
        params={"sql": sql_query}
    )
    
    return r.status_code, r.text

def run_migrations():
    print("=== SUPABASE MIGRATION EXECUTOR ===\n")
    
    # Migration 1
    with open('supabase/migrations/001_core_schema.sql', 'r') as f:
        migration1 = f.read()
    
    print("Executing migration 001_core_schema.sql...")
    status, resp = execute_sql(migration1)
    if status in [200, 201]:
        print("✓ Migration 001 executed successfully")
    elif status == 400:
        if "already exists" in resp.lower() or "relation already exists" in resp.lower():
            print("⚠ Migration 001: Tables/objects may already exist (safe)")
        else:
            print(f"❌ Migration 001 error: {resp[:300]}")
    else:
        print(f"❌ Migration 001 failed (HTTP {status}): {resp[:300]}")
    
    # Migration 2
    with open('supabase/migrations/002_payment_tables.sql', 'r') as f:
        migration2 = f.read()
    
    print("\nExecuting migration 002_payment_tables.sql...")
    status, resp = execute_sql(migration2)
    if status in [200, 201]:
        print("✓ Migration 002 executed successfully")
    elif status == 400:
        if "already exists" in resp.lower() or "relation already exists" in resp.lower():
            print("⚠ Migration 002: Tables/objects may already exist (safe)")
        else:
            print(f"❌ Migration 002 error: {resp[:300]}")
    else:
        print(f"❌ Migration 002 failed (HTTP {status}): {resp[:300]}")

if __name__ == "__main__":
    run_migrations()
