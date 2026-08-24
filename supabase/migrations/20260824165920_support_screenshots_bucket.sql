-- Create support-screenshots bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-screenshots', 'support-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: anyone can upload (public upload untuk support ticket)
CREATE POLICY "Anyone can upload support screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-screenshots');

-- RLS Policy: public read (gambar screenshot bisa diakses publik via URL)
CREATE POLICY "Public read support screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-screenshots');

-- RLS Policy: only service role can delete (admin cleanup)
CREATE POLICY "Service role can delete support screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'support-screenshots' AND auth.role() = 'service_role');
