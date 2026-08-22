-- Phase 4: make database authorization the source of truth.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- A caller may see its own profile. Active staff may see profiles needed by
-- operational screens. The target row's role must never grant access.
DROP POLICY IF EXISTS read_own_profile ON public.profiles;
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

-- Normal users can update their own non-privileged profile fields. Only a
-- super admin can target another profile or change privileged fields.
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_super_admin() AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.is_active IS DISTINCT FROM OLD.is_active OR
    NEW.email IS DISTINCT FROM OLD.email
  ) THEN
    RAISE EXCEPTION 'Privileged profile fields are server controlled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Product mutation follows the frontend matrix: manager, legacy admin and
-- super_admin may mutate; moderators retain read-only access.
DROP POLICY IF EXISTS products_admin_write ON public.products;
DROP POLICY IF EXISTS products_management_write ON public.products;
CREATE POLICY products_management_write ON public.products
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('manager', 'admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('manager', 'admin', 'super_admin')
  ));

DROP POLICY IF EXISTS product_tiers_admin_write ON public.product_tiers;
DROP POLICY IF EXISTS product_tiers_management_write ON public.product_tiers;
CREATE POLICY product_tiers_management_write ON public.product_tiers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('manager', 'admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('manager', 'admin', 'super_admin')
  ));

-- Staff may manage fulfillment status, but identity, totals and verified
-- payment state remain immutable from authenticated client requests.
CREATE OR REPLACE FUNCTION public.protect_order_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
    NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
    NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
    NEW.payment_reference IS DISTINCT FROM OLD.payment_reference OR
    NEW.payment_provider IS DISTINCT FROM OLD.payment_provider OR
    NEW.processed_at IS DISTINCT FROM OLD.processed_at
  ) THEN
    RAISE EXCEPTION 'Order payment fields are server controlled';
  END IF;
  IF auth.role() <> 'service_role' AND NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Paid status must come from verified payment state';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_order_payment_fields ON public.orders;
CREATE TRIGGER protect_order_payment_fields
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_payment_fields();

-- Audit rows are inserted through an RPC that derives actor identity from the
-- authenticated session. Direct client inserts remain denied by RLS.
CREATE OR REPLACE FUNCTION public.log_staff_activity(
  p_action text,
  p_resource text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles;
  log_id uuid;
BEGIN
  SELECT * INTO actor FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('moderator', 'manager', 'admin', 'super_admin');
  IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_action IS NULL OR btrim(p_action) = '' OR p_resource IS NULL OR btrim(p_resource) = '' THEN
    RAISE EXCEPTION 'Action and resource are required';
  END IF;
  INSERT INTO public.audit_logs(admin_id, admin_email, action, resource, resource_id, details)
  VALUES (actor.user_id, actor.email, left(p_action, 100), left(p_resource, 100), p_resource_id, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_staff_activity(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_staff_activity(text, text, text, jsonb) TO authenticated;
