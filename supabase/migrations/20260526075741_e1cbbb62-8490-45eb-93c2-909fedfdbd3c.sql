-- Enable pgcrypto for symmetric encryption (lives in the extensions schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add encrypted token columns
ALTER TABLE public.calendar_connections
  ADD COLUMN IF NOT EXISTS access_token_enc bytea,
  ADD COLUMN IF NOT EXISTS refresh_token_enc bytea;

-- Make legacy plaintext columns nullable so new rows can omit them.
-- Kept temporarily as a read-fallback; dropped in a follow-up migration.
ALTER TABLE public.calendar_connections
  ALTER COLUMN access_token DROP NOT NULL,
  ALTER COLUMN refresh_token DROP NOT NULL;

-- Insert a new connection with already-encrypted tokens
CREATE OR REPLACE FUNCTION public.insert_calendar_connection(
  _user_id uuid,
  _household_id uuid,
  _email text,
  _access_token text,
  _refresh_token text,
  _expires_at timestamptz,
  _display_name text,
  _color text,
  _key text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  INSERT INTO public.calendar_connections (
    user_id, household_id, google_account_email,
    access_token_enc, refresh_token_enc,
    token_expires_at, display_name, color, is_visible
  ) VALUES (
    _user_id, _household_id, _email,
    extensions.pgp_sym_encrypt(_access_token, _key),
    extensions.pgp_sym_encrypt(_refresh_token, _key),
    _expires_at, _display_name, _color, true
  )
  RETURNING id;
$$;

-- Refresh tokens on an existing connection. _refresh_token may be NULL
-- (Google omits it on refresh); in that case the existing value is preserved.
CREATE OR REPLACE FUNCTION public.upsert_calendar_tokens(
  _connection_id uuid,
  _access_token text,
  _refresh_token text,
  _expires_at timestamptz,
  _key text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  UPDATE public.calendar_connections
  SET
    access_token_enc = extensions.pgp_sym_encrypt(_access_token, _key),
    access_token = NULL,
    refresh_token_enc = CASE
      WHEN _refresh_token IS NOT NULL
        THEN extensions.pgp_sym_encrypt(_refresh_token, _key)
      ELSE refresh_token_enc
    END,
    refresh_token = CASE
      WHEN _refresh_token IS NOT NULL THEN NULL
      ELSE refresh_token
    END,
    token_expires_at = _expires_at,
    updated_at = now()
  WHERE id = _connection_id;
$$;

-- Decrypt and return tokens for a connection. Falls back to the legacy
-- plaintext columns for any row that hasn't been re-saved yet.
CREATE OR REPLACE FUNCTION public.get_calendar_tokens(
  _connection_id uuid,
  _key text
)
RETURNS TABLE(access_token text, refresh_token text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    COALESCE(
      CASE WHEN cc.access_token_enc IS NOT NULL
           THEN extensions.pgp_sym_decrypt(cc.access_token_enc, _key)
      END,
      cc.access_token
    ) AS access_token,
    COALESCE(
      CASE WHEN cc.refresh_token_enc IS NOT NULL
           THEN extensions.pgp_sym_decrypt(cc.refresh_token_enc, _key)
      END,
      cc.refresh_token
    ) AS refresh_token
  FROM public.calendar_connections cc
  WHERE cc.id = _connection_id;
$$;

-- Restrict helpers to the service role only
REVOKE ALL ON FUNCTION public.insert_calendar_connection(uuid, uuid, text, text, text, timestamptz, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_calendar_tokens(uuid, text, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_calendar_tokens(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.insert_calendar_connection(uuid, uuid, text, text, text, timestamptz, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_calendar_tokens(uuid, text, text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_calendar_tokens(uuid, text) TO service_role;