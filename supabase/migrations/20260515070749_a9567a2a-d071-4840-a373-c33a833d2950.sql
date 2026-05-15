
-- Backfill profiles.email_verified_at from auth.users.email_confirmed_at for any user who is confirmed in auth but missing the profile flag
UPDATE public.profiles p
SET email_verified_at = u.email_confirmed_at
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified_at IS NULL;

-- Trigger function: when auth.users.email_confirmed_at gets set, mirror it to profiles.email_verified_at
CREATE OR REPLACE FUNCTION public.sync_email_confirmation_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.profiles
    SET email_verified_at = COALESCE(email_verified_at, NEW.email_confirmed_at)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_email_confirmation_to_profile();
