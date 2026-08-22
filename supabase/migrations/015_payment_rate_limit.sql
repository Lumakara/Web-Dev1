-- Migration: Payment Rate Limiting
-- Created: 2026-08-22
-- Purpose: Prevent payment abuse via per-user throttling

-- Rate limit table (ponytail: simple sliding window, upgrade to token bucket when scale requires)
CREATE TABLE IF NOT EXISTS public.payment_rate_limit (
  user_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, window_start)
);

-- Cleanup old windows (retain 2 minutes for debugging)
-- ponytail: plain index, manual DELETE cron (WHERE clause can't use NOW())
CREATE INDEX IF NOT EXISTS idx_payment_rate_limit_cleanup 
  ON public.payment_rate_limit (window_start);

-- RPC: Check rate limit (10 req/min per user)
CREATE OR REPLACE FUNCTION public.check_payment_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Sliding 1-minute window
  v_window_start := NOW() - INTERVAL '1 minute';
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM payment_rate_limit
  WHERE user_id = p_user_id
    AND window_start >= v_window_start;
  
  -- Reject if over limit
  IF v_count >= 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Insert/update current minute bucket
  INSERT INTO payment_rate_limit (user_id, window_start, request_count)
  VALUES (p_user_id, DATE_TRUNC('minute', NOW()), 1)
  ON CONFLICT (user_id, window_start) DO UPDATE
  SET request_count = payment_rate_limit.request_count + 1;
  
  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_payment_rate_limit(UUID) TO authenticated;

-- Cleanup job (manual cron or pg_cron)
COMMENT ON TABLE public.payment_rate_limit IS 
  'Payment rate limiting. Cleanup: DELETE FROM payment_rate_limit WHERE window_start < NOW() - INTERVAL ''2 minutes'';';
