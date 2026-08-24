-- Migration 033: Enable RLS on payment_rate_limit (P2 fix)
-- Audit finding: table had RLS OFF + SELECT grant to anon → user_id + activity leaked.
-- RLS enabled with NO policies = deny-all for anon/authenticated.
-- check_payment_rate_limit() is SECURITY DEFINER owned by postgres (superuser) → bypasses RLS,
-- so existing rate-limiting flow is unaffected.

ALTER TABLE public.payment_rate_limit ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: revoke direct table grants (RLS already denies, but no reason to keep them)
REVOKE ALL ON public.payment_rate_limit FROM anon, authenticated;
