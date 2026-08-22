-- FIX 1: Remove problematic recursive policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- FIX 2: Create non-recursive policies using role column
CREATE POLICY "read_own_profile" ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = user_id OR role IN ('admin','super_admin','moderator'));

CREATE POLICY "update_own_profile" ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "admin_write_profile" ON public.profiles 
    FOR ALL 
    USING (auth.uid() = user_id OR role IN ('admin','super_admin','moderator'))
    WITH CHECK (auth.uid() = user_id OR role IN ('admin','super_admin','moderator'));

-- FIX 3: Cleanup test products
DELETE FROM products WHERE id LIKE 'test%' OR title LIKE '%Test%';

-- FIX 4: Disable RLS temporarily for tier migration
ALTER TABLE public.product_tiers DISABLE ROW LEVEL SECURITY;

-- Insert tiers with correct TEXT[] array syntax (not JSON strings)
INSERT INTO product_tiers (product_id, name, price, features) VALUES
('wifi','Basic',169900,'{Internet 20 Mbps}'),
('wifi','Standard',249900,'{Internet 50 Mbps,"Free Installation"}'),
('wifi','Premium',389900,'{Internet 100 Mbps,"Free Installation","Router Included"}'),
('cctv','Basic',299900,'{2 Camera Setup,"Recording 1 Week"}'),
('cctv','Standard',499900,'{4 Camera Setup,"Recording 2 Weeks","Mobile App Access"}'),
('cctv','Premium',899900,'{8 Camera Setup,"Recording 1 Month","Remote Access","Night Vision"}'),
('code','Fix Bug Only',150000,'{Debug Single Issue}'),
('code','Small Feature',350000,'{Add Simple Feature}'),
('code','Full Refactor',750000,'{Complete Code Review & Refactor}'),
('photo','Basic Edit',75000,'{Color Correction,Crop}'),
('photo','Advanced',149900,'{Retouching,"Background Removal",Filters}'),
('photo','Professional',249900,'{Full Retouching,Composite,"Print Ready"}'),
('video','Simple Cut',199900,'{Basic Trim,Transitions}'),
('video','Full Edit',399900,'{Complete Edit,"Color Grade","Audio Fix"}'),
('video','Premium',699900,'{Multi-cam,VFX,"Motion Graphics"}'),
('vps','Starter',149900,'{1 vCPU,2GB RAM,20GB SSD}'),
('vps','Professional',299900,'{2 vCPU,4GB RAM,50GB SSD}'),
('vps','Enterprise',599900,'{4 vCPU,8GB RAM,100GB SSD}');

-- Re-enable RLS
ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_tiers FROM product_tiers;
