-- Migration 032: Restrict decrement_product_stock to service role only
-- SECURITY: Previously any authenticated user could decrement any product's stock.
-- This function should only be callable by trusted server-side code (Edge Functions).
-- Customers must go through create_customer_order RPC which handles stock atomically.

-- Revoke execute from authenticated users
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(TEXT, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(TEXT, INT) FROM anon;

-- Only service_role (Edge Functions) may call this directly
-- create_customer_order (SECURITY DEFINER) handles stock internally via the function
-- So customers still get stock decremented — just not by calling this RPC directly.

COMMENT ON FUNCTION public.decrement_product_stock IS 
  'Atomically decrement product stock. SECURITY: callable by service_role only. '
  'Customer stock decrements go through create_customer_order RPC.';
