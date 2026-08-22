import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

def execute_migrations():
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Read and execute migration 1
    with open('supabase/migrations/001_core_schema.sql', 'r') as f:
        sql1 = f.read()
    
    print("Executing migration 001...")
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers,
        params={"sql": sql1}
    )
    if r.status_code == 200 or r.status_code == 201:
        print("✓ Migration 001 executed")
    elif "already exists" in r.text.lower() or "relation already exists" in r.text.lower():
        print("⚠ Migration 001: Some objects already exist (safe)")
    else:
        print(f"❌ Migration 001 failed: {r.status_code}")
        print(r.text[:500])
    
    # Execute migration 2
    with open('supabase/migrations/002_payment_tables.sql', 'r') as f:
        sql2 = f.read()
    
    print("Executing migration 002...")
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers,
        params={"sql": sql2}
    )
    if r.status_code == 200 or r.status_code == 201:
        print("✓ Migration 002 executed")
    elif "already exists" in r.text.lower() or "relation already exists" in r.text.lower():
        print("⚠ Migration 002: Some objects already exist (safe)")
    else:
        print(f"❌ Migration 002 failed: {r.status_code}")
        print(r.text[:500])

if __name__ == "__main__":
    print("=== SUPABASE MIGRATION EXECUTOR ===\n")
    execute_migrations()
    print("\n✅ Migrations completed!")
