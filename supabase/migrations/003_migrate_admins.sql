-- Admin migration intentionally contains no direct auth.users writes.
-- Create Auth users through the Admin API, then assign public.profiles roles.
-- See scripts/migrate-firebase-export.mjs.
SELECT 1;
