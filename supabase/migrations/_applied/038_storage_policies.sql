-- 038_storage_policies.sql
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
  ON CONFLICT (id) DO NOTHING;

-- Products bucket policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_public_read' AND tablename = 'objects') THEN
    CREATE POLICY "products_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'products');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_admin_upload' AND tablename = 'objects') THEN
    CREATE POLICY "products_admin_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND is_staff());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_admin_delete' AND tablename = 'objects') THEN
    CREATE POLICY "products_admin_delete" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND is_staff());
  END IF;
END $$;

-- Avatars: user bisa upload avatar sendiri
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_own_upload' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_own_upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_own_delete' AND tablename = 'objects') THEN
    CREATE POLICY "avatars_own_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
