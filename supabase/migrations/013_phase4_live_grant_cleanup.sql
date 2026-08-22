-- Phase 4 live verification cleanup.
-- Remove legacy profile policies and enforce provider-only payment transitions.

DROP POLICY IF EXISTS update_own_profile ON public.profiles;
DROP POLICY IF EXISTS delete_own_profile ON public.profiles;

REVOKE ALL ON FUNCTION public.apply_payment_status(UUID, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_status(UUID, TEXT, JSONB, TEXT)
  TO service_role;
