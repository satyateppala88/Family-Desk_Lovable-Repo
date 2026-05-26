ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

UPDATE public.profiles p
SET email_verified_at = u.email_confirmed_at
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified_at IS NULL;