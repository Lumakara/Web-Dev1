-- P0.5: Perketat order_items — quantity >= 1 dan deduplikasi item per order
-- Note: ADD CONSTRAINT IF NOT EXISTS tidak valid di PostgreSQL — gunakan DO $$ pattern

-- 1. quantity harus >= 1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'order_items'
      AND constraint_name = 'order_items_quantity_positive'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_quantity_positive CHECK (quantity >= 1);
  END IF;
END $$;

-- 2. Tidak boleh ada baris duplikat (order_id, product_id, tier) dalam satu order
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_no_dup
  ON order_items (order_id, product_id, tier);

COMMENT ON CONSTRAINT order_items_quantity_positive ON order_items
  IS 'Quantity must be >= 1; prevents zero/negative quantities.';
