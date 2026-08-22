"""Execute migrations via direct database connection."""
import os
import subprocess
from pathlib import Path

SUPABASE_URL = "https://txujwsolndskreywxqtq.supabase.co"
DB_PASSWORD = os.environ["SUPABASE_DATABASE_PASSWORD"]

def run_migrations():
    """Connect and execute migrations using psql-like approach."""
    
    # Extract host from URL
    parts = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '').split('.')
    if len(parts) >= 1:
        host = f"{parts[0]}.pgcommunity.service"
    else:
        host = "txujwsolndskreywxqtq.pg.community"
    
    conn_string = f"postgresql://postgres:{DB_PASSWORD}@{host}:5432/postgres"
    
    print(f"Connecting to: {conn_string}")
    
    migrations_dir = Path("/root/Web-Dev1/supabase/migrations")
    
    for migration_file in sorted(migrations_dir.glob("*.sql")):
        print(f"\n{'='*60}")
        print(f"Running: {migration_file.name}")
        print('='*60)
        
        result = subprocess.run(
            ['psql', conn_string, '-f', str(migration_file)],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print(f"✅ Success: {migration_file.name}")
            if result.stdout:
                print(result.stdout[:500])
        else:
            print(f"❌ Failed: {migration_file.name}")
            if result.stderr:
                print(result.stderr[:1000])
    
    print("\n" + "="*60)
    print("MIGRATIONS COMPLETE")
    print("="*60)

if __name__ == '__main__':
    # Check if psql is available
    try:
        subprocess.run(['which', 'psql'], check=True, capture_output=True)
        run_migrations()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  psql not found. Installing...")
        subprocess.run(['apt-get', 'update'], capture_output=True)
        subprocess.run(['apt-get', 'install', '-y', 'postgresql-client'], 
                      capture_output=True)
        run_migrations()
