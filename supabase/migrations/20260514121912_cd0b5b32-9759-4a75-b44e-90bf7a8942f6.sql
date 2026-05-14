CREATE OR REPLACE FUNCTION public.vault_upsert_push_key(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'push_service_role_key';
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret(_key, 'push_service_role_key', 'Service-role key used by dispatch_push() to invoke the send-push edge function.');
  ELSE
    PERFORM vault.update_secret(existing_id, _key, 'push_service_role_key', 'Service-role key used by dispatch_push() to invoke the send-push edge function.');
  END IF;
END;
$$;

-- Only the service role (used by the edge function) may call this.
REVOKE EXECUTE ON FUNCTION public.vault_upsert_push_key(text) FROM anon, authenticated, public;