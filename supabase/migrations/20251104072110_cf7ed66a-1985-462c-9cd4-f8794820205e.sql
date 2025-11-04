-- Add new columns to profiles table for India market features
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'IN';