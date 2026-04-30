-- Create email verification tokens table
CREATE TABLE public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create user email preferences table
CREATE TABLE public.user_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  access_updates boolean DEFAULT true,
  household_invitations boolean DEFAULT true,
  task_notifications boolean DEFAULT true,
  meal_summaries boolean DEFAULT true,
  habit_reminders boolean DEFAULT true,
  weekly_digest boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_verification_tokens
-- Allow service role to manage tokens (edge function will use service role)
CREATE POLICY "Service role can manage tokens"
ON public.email_verification_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view their own tokens (for resend cooldown check)
CREATE POLICY "Users can view their own tokens"
ON public.email_verification_tokens
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for user_email_preferences
CREATE POLICY "Users can view their email preferences"
ON public.user_email_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their email preferences"
ON public.user_email_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their email preferences"
ON public.user_email_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster token lookups
CREATE INDEX idx_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON public.email_verification_tokens(user_id);