-- Preserve the production manager role while retaining legacy admin compatibility.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'moderator', 'manager', 'admin', 'super_admin'));

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('moderator', 'manager', 'admin', 'super_admin')
  );
$$;

DROP POLICY IF EXISTS read_own_profile ON public.profiles;
CREATE POLICY read_own_profile ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR role IN ('admin', 'super_admin', 'manager', 'moderator')
  );
