-- Payment tables for Mustika/Rama integration
-- Phase 3A: Real payment gateway

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('mustika', 'rama')),
  payment_method TEXT NOT NULL,
  provider_transaction_id TEXT,
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  qr_string TEXT,
  payment_url TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  fallback_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(order_id, provider_transaction_id)
);

-- Payment events table (immutable audit trail)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);

-- RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Customer can only see their own payments
CREATE POLICY payments_customer_read ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN profiles p ON o.user_id = p.id
      WHERE o.id = payments.order_id
      AND p.user_id = auth.uid()
      AND p.role = 'customer'
    )
  );

-- Admin/super_admin can see all payments
CREATE POLICY payments_admin_read ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- Payment events: same as payments
CREATE POLICY payment_events_customer_read ON payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN orders o ON p.order_id = o.id
      JOIN profiles pr ON o.user_id = pr.id
      WHERE p.id = payment_events.payment_id
      AND pr.user_id = auth.uid()
      AND pr.role = 'customer'
    )
  );

CREATE POLICY payment_events_admin_read ON payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
