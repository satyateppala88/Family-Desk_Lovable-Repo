-- Drop the sync trigger added in the previous migration.
-- With auto_confirm_email enabled, every signup would set
-- auth.users.email_confirmed_at instantly, which would propagate to
-- profiles.email_verified_at and skip our branded verification flow.
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.sync_email_confirmation_to_profile();

-- One-shot backfill for the 3 users who are stuck because they clicked
-- Supabase's confirmation link instead of our branded one.
UPDATE public.profiles p
SET email_verified_at = u.email_confirmed_at
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified_at IS NULL;
