-- Migration 016: Security hardening — price validation + RLS fix
-- Fix C1: create_customer_order harus ambil harga dari products table, bukan payload
-- Fix H1: payments_customer_read policy pakai join yang salah

-- ============================================================
-- FIX C1: create_customer_order — validate price from DB
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_order_id TEXT,
  p_total_amount NUMERIC,
  p_items JSONB,
  p_installation_details JSONB DEFAULT NULL,
  p_panel_details JSONB DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  created_order public.orders;
  item JSONB;
  db_price NUMERIC;
  db_tier_price NUMERIC;
  effective_price NUMERIC;
  recalculated_total NUMERIC := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_total_amount <= 0 OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain items and a positive total';
  END IF;

  -- Validate each item price against DB — reject if client price doesn't match
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get base price from products table
    SELECT base_price INTO db_price
    FROM public.products
    WHERE id = item->>'product_id';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', item->>'product_id';
    END IF;

    -- Get tier price if tier is specified
    SELECT pt.price INTO db_tier_price
    FROM public.product_tiers pt
    JOIN public.products p ON pt.product_id = p.id
    WHERE p.id = item->>'product_id'
      AND pt.name = item->>'tier';

    -- Use tier price if available, else base price
    effective_price := COALESCE(db_tier_price, db_price);

    -- Validate: client-sent price must match DB price (allow 1% tolerance for rounding)
    IF ABS((item->>'price')::NUMERIC - effective_price) > (effective_price * 0.01) THEN
      RAISE EXCEPTION 'Price mismatch for product % tier %: client=% db=%',
        item->>'product_id', item->>'tier',
        (item->>'price')::NUMERIC, effective_price;
    END IF;

    recalculated_total := recalculated_total + (effective_price * COALESCE((item->>'quantity')::INTEGER, 1));
  END LOOP;

  -- Validate total amount (allow 1% tolerance for rounding)
  IF ABS(p_total_amount - recalculated_total) > (recalculated_total * 0.01) THEN
    RAISE EXCEPTION 'Total amount mismatch: client=% recalculated=%',
      p_total_amount, recalculated_total;
  END IF;

  INSERT INTO public.orders (
    id, user_id, total_amount, status, payment_status
  ) VALUES (
    p_order_id, auth.uid(), recalculated_total, 'pending', 'pending'
  )
  RETURNING * INTO created_order;

  -- Insert items using DB-validated prices, NOT client prices
  INSERT INTO public.order_items (
    order_id, product_id, title, tier, price, quantity, image
  )
  SELECT
    p_order_id,
    item->>'product_id',
    item->>'title',
    item->>'tier',
    COALESCE(
      (SELECT pt.price FROM public.product_tiers pt
       JOIN public.products p ON pt.product_id = p.id
       WHERE p.id = item->>'product_id' AND pt.name = item->>'tier'),
      (SELECT base_price FROM public.products WHERE id = item->>'product_id')
    ),
    COALESCE((item->>'quantity')::INTEGER, 1),
    item->>'image'
  FROM jsonb_array_elements(p_items) AS item;

  RETURN created_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_order(TEXT, NUMERIC, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, NUMERIC, JSONB, JSONB, JSONB) TO authenticated;

-- ============================================================
-- FIX H1: payments_customer_read — join bug fix
-- payments.order_id → orders.id → orders.user_id = auth.uid()
-- Bug: policy joined profiles.id (PK) instead of checking user_id directly
-- ============================================================
DROP POLICY IF EXISTS payments_customer_read ON public.payments;
CREATE POLICY payments_customer_read ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND o.user_id = auth.uid()
    )
  );

-- Fix payment_events_customer_read juga — same bug
DROP POLICY IF EXISTS payment_events_customer_read ON public.payment_events;
CREATE POLICY payment_events_customer_read ON public.payment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.orders o ON p.order_id = o.id
      WHERE p.id = payment_events.payment_id
        AND o.user_id = auth.uid()
    )
  );

-- Note: Removed role = 'customer' check — staff users should also see their own payments
-- Staff full access handled by payments_admin_read policy
