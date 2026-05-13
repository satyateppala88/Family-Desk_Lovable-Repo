
-- 1. Extend manual_calendar_events
ALTER TABLE public.manual_calendar_events
  ADD COLUMN IF NOT EXISTS repeat_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS member_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_system_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.manual_calendar_events
  ADD CONSTRAINT manual_calendar_events_repeat_type_chk
  CHECK (repeat_type IN ('none','daily','weekly','monthly','yearly'));

DROP POLICY IF EXISTS "Block updates to system rows" ON public.manual_calendar_events;
DROP POLICY IF EXISTS "Block deletes of system rows" ON public.manual_calendar_events;

CREATE POLICY "Block updates to system rows" ON public.manual_calendar_events
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_system_generated = false)
  WITH CHECK (is_system_generated = false);

CREATE POLICY "Block deletes of system rows" ON public.manual_calendar_events
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_system_generated = false);

-- 2. system_calendar_events
CREATE TABLE IF NOT EXISTS public.system_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('festival','national_holiday')),
  is_recurring_annual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_system_calendar_name_date
  ON public.system_calendar_events(name, event_date);
CREATE INDEX IF NOT EXISTS idx_system_calendar_date
  ON public.system_calendar_events(event_date);

ALTER TABLE public.system_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in can read system events" ON public.system_calendar_events;
CREATE POLICY "Anyone signed in can read system events"
  ON public.system_calendar_events
  FOR SELECT TO authenticated USING (true);

-- 3. Seed national holidays for 2026 and 2027 (recurring fixed dates)
INSERT INTO public.system_calendar_events (name, event_date, kind, is_recurring_annual) VALUES
  ('Republic Day',       '2026-01-26', 'national_holiday', true),
  ('Ambedkar Jayanti',   '2026-04-14', 'national_holiday', true),
  ('Independence Day',   '2026-08-15', 'national_holiday', true),
  ('Gandhi Jayanti',     '2026-10-02', 'national_holiday', true),
  ('Christmas',          '2026-12-25', 'national_holiday', true),
  ('Republic Day',       '2027-01-26', 'national_holiday', true),
  ('Ambedkar Jayanti',   '2027-04-14', 'national_holiday', true),
  ('Independence Day',   '2027-08-15', 'national_holiday', true),
  ('Gandhi Jayanti',     '2027-10-02', 'national_holiday', true),
  ('Christmas',          '2027-12-25', 'national_holiday', true)
ON CONFLICT (name, event_date) DO NOTHING;

-- 4. Seed 2026 variable festivals
INSERT INTO public.system_calendar_events (name, event_date, kind, is_recurring_annual) VALUES
  ('Holi',             '2026-03-14', 'festival', false),
  ('Eid ul-Fitr',      '2026-03-31', 'festival', false),
  ('Good Friday',      '2026-04-03', 'festival', false),
  ('Eid ul-Adha',      '2026-06-07', 'festival', false),
  ('Janmashtami',      '2026-08-15', 'festival', false),
  ('Dussehra',         '2026-10-02', 'festival', false),
  ('Diwali',           '2026-10-20', 'festival', false),
  ('Navratri starts',  '2026-10-21', 'festival', false)
ON CONFLICT (name, event_date) DO NOTHING;
