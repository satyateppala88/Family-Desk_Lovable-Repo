CREATE OR REPLACE FUNCTION public.vault_upsert_cron_secret(_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'cron_secret';
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(_secret, 'cron_secret', 'Shared secret used by pg_cron jobs to authenticate to protected edge functions.');
  ELSE
    PERFORM vault.update_secret(existing_id, _secret, 'cron_secret', 'Shared secret used by pg_cron jobs to authenticate to protected edge functions.');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vault_upsert_cron_secret(text) FROM anon, authenticated, public;