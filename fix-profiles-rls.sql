-- ===========================================
-- FIX PROFILES RLS RECURSION - PHASE 0.7
-- Execute this in Supabase SQL Editor
-- ===========================================

-- STEP 1: Drop broken recursive policies first
DROP POLICY IF EXISTS "profiles_customer_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_customer_update" ON public.profiles;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "product_tiers_public_read" ON public.product_tiers;
DROP POLICY IF EXISTS "product_tiers_admin_write" ON public.product_tiers;
DROP POLICY IF EXISTS "orders_customer_read" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_create" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
DROP POLICY IF EXISTS "order_items_read" ON public.order_items;
DROP POLICY IF EXISTS "tickets_customer_read" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_customer_create" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_admin_update" ON public.support_tickets;
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;

-- STEP 2: Create safe helper function with SECURITY DEFINER
-- This function reads role WITHOUT triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Use security definer to bypass RLS for this read
  SELECT p.role INTO user_role
  FROM profiles p
  WHERE p.user_id = uid
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'customer');
EXCEPTION WHEN OTHERS THEN
  RETURN 'customer'; -- Fallback to customer if error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set safe search_path to prevent injection
ALTER FUNCTION public.get_user_role(UUID) SET search_path = public;

-- Make function accessible to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- STEP 3: Create non-recursive RLS policies using helper function
-- Profiles policy uses get_user_role() instead of direct EXISTS query
CREATE POLICY "profiles_select_safe" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin', 'moderator')
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_safe" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Products: Public can read, only admins can write
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT
  USING (true);

CREATE POLICY "products_admin_write" ON public.products
  FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "products_admin_insert" ON public.products
  FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Product tiers: Public can read, only admins can write
CREATE POLICY "product_tiers_public_read" ON public.product_tiers
  FOR SELECT
  USING (true);

CREATE POLICY "product_tiers_admin_write" ON public.product_tiers
  FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Orders: Users can see own orders, admins/mods can see all
CREATE POLICY "orders_customer_read" ON public.orders
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin', 'moderator')
  );

CREATE POLICY "orders_customer_create" ON public.orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin', 'moderator'));

-- Order items: Follow orders policy
CREATE POLICY "order_items_read" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin', 'moderator'))
    )
  );

-- Support tickets: Users can see their own, admins can see all
CREATE POLICY "tickets_customer_read" ON public.support_tickets
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin', 'moderator')
  );

CREATE POLICY "tickets_customer_create" ON public.support_tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "tickets_admin_update" ON public.support_tickets
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin', 'moderator'));

-- Audit logs: Admins and above only
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT
  USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- STEP 4: Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- STEP 5: Verify fix
SELECT 
  'RLS Status' AS check_type,
  tablename,
  rowsecurity::text AS value
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'product_tiers', 'orders', 'order_items', 'support_tickets', 'audit_logs')
ORDER BY tablename;

SELECT 
  'Policy Count' AS check_type,
  COUNT(*)::text AS value
FROM pg_policies
WHERE tablename = 'profiles';
