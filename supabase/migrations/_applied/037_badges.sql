-- 037_badges.sql
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'first_order', 'loyal_customer', 'big_spender',
    'reviewer', 'early_adopter', 'vip'
  )),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_own_read" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges_staff_read" ON user_badges FOR SELECT USING (is_staff());
CREATE POLICY "badges_service_write" ON user_badges FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_and_assign_badges(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_count INT;
  v_total_spend NUMERIC;
  v_review_count INT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO v_order_count, v_total_spend
  FROM orders WHERE user_id = p_user_id AND status = 'completed';

  SELECT COUNT(*) INTO v_review_count
  FROM product_reviews WHERE user_id = p_user_id;

  IF v_order_count >= 1 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'first_order') ON CONFLICT DO NOTHING;
  END IF;
  IF v_order_count >= 5 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'loyal_customer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_spend >= 1000000 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'big_spender') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_spend >= 5000000 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'vip') ON CONFLICT DO NOTHING;
  END IF;
  IF v_review_count >= 3 THEN
    INSERT INTO user_badges(user_id, badge_type) VALUES (p_user_id, 'reviewer') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
