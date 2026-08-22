-- Migration: Dashboard Statistics RPC
-- Created: 2026-08-22
-- Purpose: Move dashboard aggregations from client to PostgreSQL for performance

-- Drop existing function if any
DROP FUNCTION IF EXISTS public.get_dashboard_statistics();

-- Create dashboard statistics function
-- Security: Only callable by staff (super_admin, manager, admin, moderator)
CREATE OR REPLACE FUNCTION public.get_dashboard_statistics()
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue NUMERIC,
  pending_orders BIGINT,
  completed_orders BIGINT,
  cancelled_orders BIGINT,
  today_orders BIGINT,
  today_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Only staff can call this function
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Access denied: staff role required';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_orders,
    COALESCE(SUM(total_amount), 0)::NUMERIC AS total_revenue,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_orders,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled_orders,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::BIGINT AS today_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0)::NUMERIC AS today_revenue
  FROM orders;
END;
$$;

-- Grant execute permission to authenticated users (RLS + function body will enforce staff-only)
GRANT EXECUTE ON FUNCTION public.get_dashboard_statistics() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_dashboard_statistics() IS 'Returns aggregated dashboard statistics. Only callable by staff roles (enforced in function body).';
