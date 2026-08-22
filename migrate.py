import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Supabase database credentials
DB_HOST = "aws-0-eu-central-1.pooler.supabase.com"
DB_PORT = 6543
DB_NAME = "postgres"
DB_USER = "postgres.txujwsolndskreywxqtq"
DB_PASSWORD = os.environ["SUPABASE_DATABASE_PASSWORD"]

def execute_migration():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # Read migration files
        with open('supabase/migrations/001_core_schema.sql', 'r') as f:
            migration1 = f.read()
        
        with open('supabase/migrations/002_payment_tables.sql', 'r') as f:
            migration2 = f.read()
        
        print("Executing migration 001_core_schema.sql...")
        cursor.execute(migration1)
        conn.commit()
        print("✓ Migration 001 completed")
        
        print("Executing migration 002_payment_tables.sql...")
        cursor.execute(migration2)
        conn.commit()
        print("✓ Migration 002 completed")
        
        # Verify tables
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n✓ Tables created: {tables}")
        
        cursor.close()
        conn.close()
        print("\n✅ All migrations executed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    execute_migration()
