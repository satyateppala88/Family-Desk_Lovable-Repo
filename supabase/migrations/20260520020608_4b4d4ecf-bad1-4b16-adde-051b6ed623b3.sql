
ALTER TABLE public.manual_calendar_events
  ADD COLUMN IF NOT EXISTS parent_event_id uuid REFERENCES public.manual_calendar_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS exception_dates date[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_manual_calendar_events_parent
  ON public.manual_calendar_events(parent_event_id);
