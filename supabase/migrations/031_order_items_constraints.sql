-- P0.5: Perketat order_items — quantity >= 1 dan deduplikasi item per order
-- Idempotent: gunakan IF NOT EXISTS / DO $$ pattern

-- 1. quantity harus >= 1
ALTER TABLE order_items
  ADD CONSTRAINT IF NOT EXISTS order_items_quantity_positive CHECK (quantity >= 1);

-- 2. Tidak boleh ada baris duplikat (order_id, product_id, tier) dalam satu order
--    Jika sudah ada duplikat di data lama, index ini gagal — admin perlu dedup manual.
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_no_dup
  ON order_items (order_id, product_id, tier);

COMMENT ON CONSTRAINT order_items_quantity_positive ON order_items
  IS 'Quantity must be >= 1; prevents zero/negative quantities.';
