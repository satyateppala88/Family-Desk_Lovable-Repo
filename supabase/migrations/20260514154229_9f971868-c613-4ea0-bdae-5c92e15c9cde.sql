-- Shared recurrence engine: add jsonb columns across modules.
-- Existing legacy columns (repeat_type, recurring_pattern, frequency_type, frequency)
-- are preserved and kept in sync at the application layer for backwards compatibility.

ALTER TABLE public.manual_calendar_events
  ADD COLUMN IF NOT EXISTS recurrence jsonb DEFAULT NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence jsonb DEFAULT NULL;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS recurrence jsonb DEFAULT NULL;

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS recurrence_end jsonb DEFAULT NULL;

ALTER TABLE public.finance_subscriptions
  ADD COLUMN IF NOT EXISTS recurrence jsonb DEFAULT NULL;

ALTER TABLE public.finance_subscriptions
  ADD COLUMN IF NOT EXISTS recurrence_end jsonb DEFAULT NULL;