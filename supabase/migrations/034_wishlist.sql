-- 034_wishlist.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_profiles_favorites ON profiles USING GIN(favorites);
