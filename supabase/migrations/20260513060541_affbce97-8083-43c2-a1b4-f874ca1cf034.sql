ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS pantry_daily_reminder boolean NOT NULL DEFAULT false;