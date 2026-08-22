import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
}

# Get all tables with policies
print("=== CHECKING EXISTING POLICIES ===\n")

# Check profiles policies
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/rls_policies?relname=profiles&select=*",
    headers=headers
)
if r.status_code == 200:
    policies = r.json()
    print(f"Profiles policies ({len(policies)}):")
    for p in policies[:5]:
        print(f"  - {p['name']}: {p['policy_name']}")
else:
    print(f"Error checking policies: {r.text[:200]}")

# Clean up problematic profiles policy (infinite recursion)
print("\n=== FIXING PROFILES RLS POLICY ===")

fix_sql = """
-- Drop existing broken policy
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create proper policy without recursive query
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = user_id OR role IN ('admin', 'super_admin', 'moderator'));

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admin write policy
CREATE POLICY "Admins can write" ON public.profiles
    FOR ALL
    USING (auth.uid() = user_id OR role IN ('admin', 'super_admin', 'moderator'))
    WITH CHECK (auth.uid() = user_id OR role IN ('admin', 'super_admin', 'moderator'));
"""

print("Executing fix SQL...")
# Note: Cannot execute via REST API due to parameter limitations
# This requires dashboard execution or pgAdmin
