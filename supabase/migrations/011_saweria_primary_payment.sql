-- Saweria via ApiNEOXR is the primary QRIS provider. Rama remains the only
-- retryable fallback; Mustika stays in the schema for possible future use.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.payments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%provider%mustika%rama%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('saweria', 'rama', 'mustika'));

COMMENT ON COLUMN public.payments.provider IS
  'Active customer flow: saweria primary, rama retryable fallback. Mustika is disabled but retained.';

