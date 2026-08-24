-- 035_product_reviews.sql
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT NOT NULL DEFAULT 'Pengguna Anonim',
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_ip_hash ON product_reviews(ip_hash, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_ip_product_day
  ON product_reviews(product_id, ip_hash, (created_at::date));

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read" ON product_reviews
  FOR SELECT USING (is_visible = true);
CREATE POLICY "reviews_insert_anon" ON product_reviews
  FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_staff_all" ON product_reviews
  FOR ALL USING (is_staff());

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pid TEXT;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE products SET
    rating = (SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)
              FROM product_reviews WHERE product_id = pid AND is_visible = true),
    reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id = pid AND is_visible = true)
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_rating ON product_reviews;
CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();
