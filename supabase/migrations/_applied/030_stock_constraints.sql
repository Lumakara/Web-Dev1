-- Stock validation and atomic decrement
-- Adds check constraint and RPC for atomic stock operations

-- 1. Add check constraint: stock >= 0
ALTER TABLE products
  ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);

-- 2. Atomic stock decrement function
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id TEXT,
  p_quantity INT
)
RETURNS TABLE(success BOOLEAN, new_stock INT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- ponytail: row-level lock, upgrade to partition when products > 100k
  SELECT stock INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'Product not found';
    RETURN;
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT FALSE, v_current_stock, 'Insufficient stock';
    RETURN;
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  UPDATE products
  SET stock = v_new_stock, updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY SELECT TRUE, v_new_stock, 'Stock decremented';
END;
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION decrement_product_stock(TEXT, INT) TO authenticated;

COMMENT ON FUNCTION decrement_product_stock IS 'Atomically decrement product stock with validation. Returns success, new_stock, message.';
