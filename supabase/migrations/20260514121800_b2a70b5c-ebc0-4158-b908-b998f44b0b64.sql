-- Store service-role key in Vault (encrypted) instead of a plaintext column.
-- Idempotent: if the secret already exists, update it; otherwise create it.
DO $$
DECLARE
  existing_id uuid;
  current_key text;
BEGIN
  -- Pull existing key from the table (if present) so we can seed the Vault
  -- without losing it during this migration.
  SELECT service_role_key INTO current_key
  FROM public.push_dispatch_config
  WHERE id = true
  LIMIT 1;

  IF current_key IS NULL OR length(current_key) = 0 THEN
    RAISE NOTICE 'No existing service_role_key in push_dispatch_config; Vault entry will be empty until bootstrap-push-config runs.';
  ELSE
    SELECT id INTO existing_id FROM vault.secrets WHERE name = 'push_service_role_key';
    IF existing_id IS NULL THEN
      PERFORM vault.create_secret(current_key, 'push_service_role_key', 'Service-role key used by dispatch_push() to invoke the send-push edge function.');
    ELSE
      PERFORM vault.update_secret(existing_id, current_key, 'push_service_role_key', 'Service-role key used by dispatch_push() to invoke the send-push edge function.');
    END IF;
  END IF;
END $$;

-- Refactor dispatch_push to read the key from Vault.
CREATE OR REPLACE FUNCTION public.dispatch_push(
  _user_ids uuid[],
  _channel text,
  _title text,
  _body text,
  _url text DEFAULT '/'::text,
  _tag text DEFAULT NULL::text,
  _data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  base text;
  key  text;
  payload jsonb;
BEGIN
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT base_url INTO base FROM public.push_dispatch_config WHERE id = true LIMIT 1;
  IF base IS NULL THEN RETURN; END IF;

  SELECT decrypted_secret INTO key
  FROM vault.decrypted_secrets
  WHERE name = 'push_service_role_key'
  LIMIT 1;

  IF key IS NULL THEN
    RAISE NOTICE 'dispatch_push: push_service_role_key missing from Vault; skipping push.';
    RETURN;
  END IF;

  payload := jsonb_build_object(
    'user_ids', to_jsonb(_user_ids),
    'channel', _channel,
    'title', _title,
    'body', _body,
    'url', _url,
    'tag', _tag,
    'data', _data
  );

  PERFORM net.http_post(
    url := base || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key,
      'apikey', key
    ),
    body := payload,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'dispatch_push failed: %', SQLERRM;
END;
$function$;

-- Drop the plaintext column now that the function reads from Vault.
ALTER TABLE public.push_dispatch_config DROP COLUMN IF EXISTS service_role_key;

-- Lock down direct access to vault from API roles (defense in depth — Supabase
-- already restricts this, but make the intent explicit).
REVOKE ALL ON SCHEMA vault FROM anon, authenticated;