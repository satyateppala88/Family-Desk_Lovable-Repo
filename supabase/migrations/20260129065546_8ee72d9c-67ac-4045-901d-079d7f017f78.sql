-- Add phone verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN DEFAULT false;

-- Create phone_verification_tokens table for OTP storage
CREATE TABLE IF NOT EXISTS public.phone_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on phone_verification_tokens
ALTER TABLE public.phone_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view their own phone tokens"
ON public.phone_verification_tokens
FOR SELECT
USING (user_id = auth.uid());

-- Service role can manage all tokens (for edge functions)
CREATE POLICY "Service role can manage phone tokens"
ON public.phone_verification_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add WhatsApp preference columns to user_email_preferences
ALTER TABLE public.user_email_preferences
ADD COLUMN IF NOT EXISTS task_notifications_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_plan_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pantry_alerts_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS habit_reminders_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS household_invitations_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_digest_whatsapp BOOLEAN DEFAULT false;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_phone_verification_tokens_user_phone 
ON public.phone_verification_tokens(user_id, phone_number);

-- Create index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_phone_verification_tokens_expires 
ON public.phone_verification_tokens(expires_at);