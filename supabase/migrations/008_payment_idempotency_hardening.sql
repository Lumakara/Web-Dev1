-- Payment reconciliation hardening.
-- Keeps one active payment instruction per order while making provider references
-- and webhook events explicit and idempotent.

-- Checkout no longer collects installation or panel account credentials.
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS installation_details,
  DROP COLUMN IF EXISTS panel_details;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS ref_no TEXT,
  ADD COLUMN IF NOT EXISTS provider_ref TEXT;

UPDATE public.payments
SET ref_no = COALESCE(ref_no, provider_transaction_id),
    provider_ref = COALESCE(provider_ref, provider_transaction_id)
WHERE provider_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_unique
  ON public.payments(provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_idempotency_unique
  ON public.payment_events(payment_id, event_type, status);

CREATE OR REPLACE FUNCTION public.apply_payment_status(
  p_payment_id UUID,
  p_status TEXT,
  p_provider_response JSONB DEFAULT '{}'::jsonb,
  p_event_type TEXT DEFAULT 'status_sync'
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_payment public.payments;
  updated_payment public.payments;
  now_value TIMESTAMPTZ := NOW();
BEGIN
  IF p_status NOT IN ('pending', 'paid', 'failed', 'expired') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;

  SELECT * INTO current_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  IF current_payment.status IN ('paid', 'failed', 'expired') THEN
    RETURN current_payment;
  END IF;

  UPDATE public.payments
  SET status = p_status,
      paid_at = CASE WHEN p_status = 'paid' THEN COALESCE(paid_at, now_value) ELSE paid_at END,
      processed_at = CASE WHEN p_status IN ('paid', 'failed', 'expired') THEN COALESCE(processed_at, now_value) ELSE processed_at END,
      failure_reason = CASE WHEN p_status = 'failed' THEN COALESCE(failure_reason, 'Provider marked payment as failed') ELSE failure_reason END
  WHERE id = p_payment_id
  RETURNING * INTO updated_payment;

  UPDATE public.orders
  SET payment_status = p_status,
      payment_provider = updated_payment.provider,
      payment_reference = COALESCE(updated_payment.ref_no, updated_payment.provider_ref, updated_payment.provider_transaction_id),
      status = CASE WHEN p_status = 'paid' THEN 'paid' ELSE status END,
      processed_at = CASE WHEN p_status = 'paid' THEN COALESCE(processed_at, now_value) ELSE processed_at END
  WHERE id = updated_payment.order_id;

  INSERT INTO public.payment_events(payment_id, order_id, event_type, status, provider_response)
  VALUES (updated_payment.id, updated_payment.order_id, p_event_type, p_status, p_provider_response)
  ON CONFLICT (payment_id, event_type, status) DO NOTHING;

  RETURN updated_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_status(UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_payment_status(UUID, TEXT, JSONB, TEXT) TO service_role;
