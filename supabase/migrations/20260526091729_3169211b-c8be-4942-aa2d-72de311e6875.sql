ALTER TABLE public.phone_verification_tokens
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_phone_verification_tokens_active
  ON public.phone_verification_tokens (user_id, phone_number, used_at, expires_at)
  WHERE used_at IS NULL;