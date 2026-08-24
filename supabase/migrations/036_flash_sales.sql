-- 036_flash_sales.sql
CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage INT CHECK (discount_percentage BETWEEN 1 AND 100),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_product ON flash_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_flash_sales_active ON flash_sales(starts_at, ends_at);

ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flash_sales_public_read" ON flash_sales FOR SELECT USING (true);
CREATE POLICY "flash_sales_admin_write" ON flash_sales FOR ALL USING (is_admin());
