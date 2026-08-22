import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Step 1: Check existing products
print("=== CHECKING EXISTING PRODUCTS ===\n")

r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,title,stock", headers=headers)
if r.status_code == 200:
    products = r.json()
    print(f"Database has {len(products)} products:")
    for p in products:
        print(f"  - ID: {p['id']}, Title: {p['title'][:50]}, Stock: {p['stock']}")
else:
    print(f"Error: {r.text[:200]}")
    products = []

# Step 2: Load source data
with open('src/data/products.json', 'r') as f:
    import json
    source_data = json.load(f)

source_products = source_data.get('products', [])
print(f"\nSource (products.json) has {len(source_products)} products:")
for p in source_products:
    print(f"  - ID: {p['id']}, Title: {p['title'][:50]}")

# Step 3: Find test/dummy product to delete
print("\n=== CLEANING UP TEST PRODUCT ===")

test_product_id = None
for p in products:
    # Look for test product by title or characteristics
    if 'test' in p['title'].lower() or p['stock'] == 100 and len(p.get('title', '')) < 20:
        test_product_id = p['id']
        print(f"Found test product: {p['title']} (ID: {p['id']})")
        break

if test_product_id:
    # Delete test product
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{test_product_id}",
        headers=headers
    )
    if r.status_code in [204, 200]:
        print(f"✓ Deleted test product")
    else:
        print(f"⚠ Delete failed: {r.text[:200]}")

# Step 4: Verify clean count
r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id", headers=headers)
clean_count = len(r.json()) if r.status_code == 200 else 0
print(f"\n✓ Products after cleanup: {clean_count}")

# Step 5: Migrate tiers with proper auth bypass using direct SQL
print("\n=== MIGRATING TIERS (Requires Dashboard Execution) ===")

print("""
⚠ BLOCKER: Cannot migrate tiers via REST API due to RLS recursion issue.

MANUAL ACTION REQUIRED:
Go to https://txujwsolndskreywxqtq.supabase.co/sql and execute:

-- Disable RLS temporarily
ALTER TABLE public.product_tiers DISABLE ROW LEVEL SECURITY;

-- Insert tiers for all 6 products
INSERT INTO product_tiers (product_id, name, price, features) VALUES
('wifi', 'Basic', 169900, '["Internet 20 Mbps"]'),
('wifi', 'Standard', 249900, '["Internet 50 Mbps", "Free Installation"]'),
('wifi', 'Premium', 389900, '["Internet 100 Mbps", "Free Installation", "Router Included"]'),
('cctv', 'Basic', 299900, '["2 Camera Setup", "Recording 1 Week"]'),
('cctv', 'Standard', 499900, '["4 Camera Setup", "Recording 2 Weeks", "Mobile App Access"]'),
('cctv', 'Premium', 899900, '["8 Camera Setup", "Recording 1 Month", "Remote Access", "Night Vision"]'),
('code-repair', 'Fix Bug Only', 150000, '["Debug Single Issue"]'),
('code-repair', 'Small Feature', 350000, '["Add Simple Feature"]'),
('code-repair', 'Full Refactor', 750000, '["Complete Code Review & Refactor"]'),
('photo-editing', 'Basic Edit', 75000, '["Color Correction", "Crop"]'),
('photo-editing', 'Advanced', 149900, '["Retouching", "Background Removal", "Filters"]'),
('photo-editing', 'Professional', 249900, '["Full Retouching", "Composite", "Print Ready"]'),
('video-editing', 'Simple Cut', 199900, '["Basic Trim", "Transitions"]'),
('video-editing', 'Full Edit', 399900, '["Complete Edit", "Color Grade", "Audio Fix"]'),
('video-editing', 'Premium', 699900, '["Multi-cam", "VFX", "Motion Graphics"]'),
('vps-hosting', 'Starter', 149900, '["1 vCPU", "2GB RAM", "20GB SSD"]'),
('vps-hosting', 'Professional', 299900, '["2 vCPU", "4GB RAM", "50GB SSD"]'),
('vps-hosting', 'Enterprise', 599900, '["4 vCPU", "8GB RAM", "100GB SSD"]');

-- Re-enable RLS
ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;
""")

# Step 6: Create script for dashboard copy-paste
script_sql = """-- RUN THIS IN SUPABASE DASHBOARD
-- Fix profiles RLS policy
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "read_own_profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR role IN ('admin','super_admin','moderator'));
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admin_write_profile" ON public.profiles FOR ALL USING (auth.uid() = user_id OR role IN ('admin','super_admin','moderator')) WITH CHECK (auth.uid() = user_id OR role IN ('admin','super_admin','moderator'));

-- Cleanup test products
DELETE FROM products WHERE id LIKE 'test%' OR title LIKE '%Test%';

-- Migrate tiers
ALTER TABLE public.product_tiers DISABLE ROW LEVEL SECURITY;
INSERT INTO product_tiers (product_id, name, price, features) VALUES 
('wifi','Basic',169900,'["Internet 20 Mbps"]'),('wifi','Standard',249900,'["Internet 50 Mbps","Free Installation"]'),('wifi','Premium',389900,'["Internet 100 Mbps","Free Installation","Router Included"]'),
('cctv','Basic',299900,'["2 Camera Setup","Recording 1 Week"]'),('cctv','Standard',499900,'["4 Camera Setup","Recording 2 Weeks","Mobile App Access"]'),('cctv','Premium',899900,'["8 Camera Setup","Recording 1 Month","Remote Access","Night Vision"]'),
('code-repair','Fix Bug Only',150000,'["Debug Single Issue"]'),('code-repair','Small Feature',350000,'["Add Simple Feature"]'),('code-repair','Full Refactor',750000,'["Complete Code Review & Refactor"]'),
('photo-editing','Basic Edit',75000,'["Color Correction","Crop"]'),('photo-editing','Advanced',149900,'["Retouching","Background Removal","Filters"]'),('photo-editing','Professional',249900,'["Full Retouching","Composite","Print Ready"]'),
('video-editing','Simple Cut',199900,'["Basic Trim","Transitions"]'),('video-editing','Full Edit',399900,'["Complete Edit","Color Grade","Audio Fix"]'),('video-editing','Premium',699900,'["Multi-cam","VFX","Motion Graphics"]'),
('vps-hosting','Starter',149900,'["1 vCPU","2GB RAM","20GB SSD"]'),('vps-hosting','Professional',299900,'["2 vCPU","4GB RAM","50GB SSD"]'),('vps-hosting','Enterprise',599900,'["4 vCPU","8GB RAM","100GB SSD"]');
ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;
"""

with open('/root/Web-Dev1/MIGRATION_SCRIPT.sql', 'w') as f:
    f.write(script_sql)

print("\n✅ Script saved to /root/Web-Dev1/MIGRATION_SCRIPT.sql")
print("Run this via Supabase Dashboard SQL Editor at: https://txujwsolndskreywxqtq.supabase.co/sql")
