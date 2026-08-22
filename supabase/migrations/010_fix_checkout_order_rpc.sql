-- Keep checkout order creation aligned with the current orders schema.
-- Legacy installation/panel credential payloads are intentionally ignored.
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_total_amount <= 0 OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain items and a positive total';
  END IF;

  INSERT INTO public.orders (
    id, user_id, total_amount, status, payment_status
  ) VALUES (
    p_order_id, auth.uid(), p_total_amount, 'pending', 'pending'
  )
  RETURNING * INTO created_order;

  INSERT INTO public.order_items (
    order_id, product_id, title, tier, price, quantity, image
  )
  SELECT
    p_order_id,
    item->>'product_id',
    item->>'title',
    item->>'tier',
    (item->>'price')::NUMERIC,
    COALESCE((item->>'quantity')::INTEGER, 1),
    item->>'image'
  FROM jsonb_array_elements(p_items) AS item;

  RETURN created_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_order(TEXT, NUMERIC, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, NUMERIC, JSONB, JSONB, JSONB) TO authenticated;
