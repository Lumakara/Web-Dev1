-- Tighten helper function exposure and remove avoidable search_path warnings.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS settings_admin_write ON public.settings;
CREATE POLICY settings_admin_insert ON public.settings
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY settings_admin_update ON public.settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY settings_admin_delete ON public.settings
  FOR DELETE USING (public.is_admin());
