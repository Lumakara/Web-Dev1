-- Production hardening: align the database with the application and Edge Functions.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('moderator', 'admin', 'super_admin')
      AND is_active = true
  );
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS installation_details JSONB,
  ADD COLUMN IF NOT EXISTS panel_details JSONB,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_per_order
  ON public.payments(order_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_auth_users_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_auth_users_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@invalid.local'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'customer',
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS profiles_customer_read ON public.profiles;
DROP POLICY IF EXISTS profiles_customer_update ON public.profiles;
DROP POLICY IF EXISTS profiles_customer_insert ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_staff())
  WITH CHECK (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS products_admin_write ON public.products;
CREATE POLICY products_admin_write ON public.products FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS product_tiers_admin_write ON public.product_tiers;
CREATE POLICY product_tiers_admin_write ON public.product_tiers FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS orders_customer_read ON public.orders;
DROP POLICY IF EXISTS orders_customer_create ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_read ON public.orders FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY orders_insert ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY orders_staff_update ON public.orders FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS order_items_read ON public.order_items;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
CREATE POLICY order_items_read ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff())
  ));
CREATE POLICY order_items_insert ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS tickets_customer_read ON public.support_tickets;
DROP POLICY IF EXISTS tickets_customer_create ON public.support_tickets;
DROP POLICY IF EXISTS tickets_admin_update ON public.support_tickets;
CREATE POLICY tickets_read ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY tickets_staff_update ON public.support_tickets FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS payments_customer_read ON public.payments;
DROP POLICY IF EXISTS payments_admin_read ON public.payments;
CREATE POLICY payments_read ON public.payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff())
  ));

DROP POLICY IF EXISTS payment_events_customer_read ON public.payment_events;
DROP POLICY IF EXISTS payment_events_admin_read ON public.payment_events;
CREATE POLICY payment_events_read ON public.payment_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE p.id = payment_id AND (o.user_id = auth.uid() OR public.is_staff())
  ));

DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_staff_read ON public.audit_logs FOR SELECT USING (public.is_staff());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY avatars_owner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP FUNCTION IF EXISTS public.create_customer_order(TEXT, NUMERIC, JSONB, JSONB, JSONB);
CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_order_id TEXT,
  p_total_amount NUMERIC,
  p_items JSONB
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_order public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_total_amount <= 0 OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain items and a positive total';
  END IF;

  INSERT INTO public.orders (
    id, user_id, total_amount, status, payment_status
  ) VALUES (
    p_order_id, auth.uid(), p_total_amount, 'pending', 'pending'
  ) RETURNING * INTO created_order;

  INSERT INTO public.order_items (order_id, product_id, title, tier, price, quantity, image)
  SELECT
    p_order_id,
    item->>'product_id',
    item->>'title',
    item->>'tier',
    (item->>'price')::NUMERIC,
    COALESCE((item->>'quantity')::INTEGER, 1),
    item->>'image'
  FROM jsonb_array_elements(p_items) AS item;

  RETURN created_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, NUMERIC, JSONB) TO authenticated;
