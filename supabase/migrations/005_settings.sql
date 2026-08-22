-- Application settings used by the admin settings screen.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
  );
$$;

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_staff_read ON public.settings;
CREATE POLICY settings_staff_read ON public.settings
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS settings_admin_write ON public.settings;
CREATE POLICY settings_admin_write ON public.settings
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.settings (key, value)
VALUES
  ('site_name', '"Layanan Digital"'::jsonb),
  ('email_support', '""'::jsonb),
  ('currency', '"IDR"'::jsonb),
  ('timezone', '"Asia/Jakarta"'::jsonb),
  ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
