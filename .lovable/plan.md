## E-08 — Manual Events upgrade, Indian Festival Layer, Festival→Tasks

### Current state vs. spec

`manual_calendar_events` already exists and the "Add Event" button already opens `CreateEventDialog` (no Google connection required) — Change 1 is partially done. The form is missing **Repeat** and **Who** controls; events table is missing **repeat_type / member_ids / is_system_generated**. We also need a system events layer and a dashboard banner.

We will reuse `manual_calendar_events` rather than introduce a new `calendar_events` table (less churn, fetch path + RLS already wired). System festivals live in a separate `system_calendar_events` table because they're shared across every household and must be read-only.

---

### Change 1 — Manual event form upgrade

**Migration** (additive only, no data destruction):

```sql
ALTER TABLE public.manual_calendar_events
  ADD COLUMN repeat_type text NOT NULL DEFAULT 'none',
  ADD COLUMN member_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN is_system_generated boolean NOT NULL DEFAULT false;

-- Lock down system rows (defence in depth; users never insert these into this table,
-- but enforce no-edit/no-delete on any future system rows).
CREATE POLICY "Block updates to system rows" ON public.manual_calendar_events
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_system_generated = false) WITH CHECK (is_system_generated = false);
CREATE POLICY "Block deletes of system rows" ON public.manual_calendar_events
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_system_generated = false);
```

**`CreateEventDialog`** gains:
- `RepeatSelect` (None / Daily / Weekly / Monthly / Yearly).
- `Who` checklist using `useHouseholdMembers` — defaults to all members checked.
- Description label changed to "Notes" to match spec.

Form submits via the existing `useCreateManualEvent` hook, now extended to forward `repeat_type` and `member_ids`. The "Add Event" entry point in `CalendarHeader` and the empty-state CTA both already open this dialog without forcing Google connect — kept as-is.

**Recurrence expansion (server-side).** `supabase/functions/fetch-calendar-events/index.ts` already reads `manual_calendar_events` for the requested window. Update its manual-events block to expand `repeat_type !== 'none'` rows into occurrences inside `[startDate, endDate]`:
- daily — every day from `start_at` until end of window
- weekly — same day-of-week
- monthly — same day-of-month (clamped to month length)
- yearly — same month/day

Each emitted occurrence reuses the parent id with a date-suffixed key (`manual-<uuid>-<yyyymmdd>`) so the grid de-duplicates correctly. `member_ids` is forwarded through the response so the day cell can show a small avatar tag (out of scope for this change — kept for future).

### Change 2 — Indian Festival & Holiday Layer

**New table** (no household_id — shared, read-only):

```sql
CREATE TABLE public.system_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('festival','national_holiday')),
  is_recurring_annual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_calendar_events_date ON public.system_calendar_events(event_date);

ALTER TABLE public.system_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read" ON public.system_calendar_events
  FOR SELECT TO authenticated USING (true);
-- No insert/update/delete policies → blocked for users; only service role.
```

**Seed data** (in the migration via `INSERT … ON CONFLICT DO NOTHING`, with a unique index on `(name, event_date)`):
- Recurring annual fixed-date entries seeded for **2026 and 2027**:
  - National holidays (`kind='national_holiday'`): Republic Day 01-26, Ambedkar Jayanti 04-14, Independence Day 08-15, Gandhi Jayanti 10-02, Christmas 12-25.
- Variable festivals seeded only for the year(s) provided in the spec (`kind='festival'`, `is_recurring_annual=false`):
  - 2026: Holi 03-14, Eid ul-Fitr 03-31, Good Friday 04-03, Eid ul-Adha 06-07, Janmashtami 08-15, Dussehra 10-02, Navratri starts 10-21, Diwali 10-20.

**Edge function update.** Inside `fetch-calendar-events`, add a third pull alongside Google + manual:

```ts
const { data: sys } = await supabase
  .from("system_calendar_events")
  .select("*")
  .gte("event_date", startDay)
  .lt("event_date", endDay);
for (const s of sys ?? []) {
  allEvents.push({
    id: `system-${s.id}`,
    title: s.name,
    start: `${s.event_date}T00:00:00Z`,
    end:   `${s.event_date}T23:59:59Z`,
    allDay: true,
    color: s.kind === 'festival' ? '#F97316' /* orange */ : '#3B82F6' /* blue */,
    calendarName: s.kind === 'festival' ? 'Festivals' : 'National holidays',
    calendarOwner: 'system',
    calendarId: 'system',
  });
}
```

**Calendar grid styling.** `CalendarGrid` already paints events. We will:
- Render system events as a **small coloured dot row beneath the day number** (orange/blue depending on `calendarId === 'system'` + color), instead of the regular event chip.
- Tapping a dot opens a tiny popover/tooltip with the festival name (no edit dialog).
- Other clicks on system events are intercepted in `Calendar.tsx`'s `onEventClick` — if `event.calendarId === 'system'`, ignore (no `CalendarEventDialog` open).

`CalendarLegend` gets two extra rows: orange "Festivals", blue "National holidays".

### Change 3 — Festival → Task suggestions

**New hook** `src/hooks/useUpcomingFestival.ts`:
- Queries `system_calendar_events` for `kind = 'festival'` AND `event_date BETWEEN today AND today+14d`, returns the soonest one.

**Pre-built checklists** in `src/data/festivalChecklists.ts`:

```ts
export const FESTIVAL_CHECKLISTS: Record<string, string[]> = {
  Diwali: [
    "Deep clean the house",
    "Buy diyas and candles",
    "Order sweets and dry fruits",
    "Book fireworks",
    "Send Diwali wishes",
    "Prepare rangoli materials",
  ],
  Holi: [
    "Buy colours",
    "Arrange water balloons",
    "Plan menu for Holi party",
  ],
  "Eid ul-Fitr": [
    "Plan sevai recipe",
    "Buy new clothes",
    "Arrange family gathering",
  ],
  "Eid ul-Adha": [
    "Plan biryani menu",
    "Arrange family gathering",
    "Buy new clothes",
  ],
  // Default fallback used when a matching key is missing
};
```

A `matchChecklist(name)` helper does a case-insensitive `includes` lookup so "Eid ul-Fitr" / "Diwali" / "Holi" map even with extra qualifiers.

**Banner component** `src/components/dashboard/FestivalBanner.tsx`:
- Pulls `useUpcomingFestival()`. If a match exists and the user has not dismissed it (localStorage key `festival-banner-dismissed-<festivalId>`), show:
  - Copy: `"{Name} is in {N} day{s} — want to add a preparation checklist to Tasks?"`
  - Buttons: "Add checklist" (primary), "Dismiss" (ghost).
- "Add checklist" iterates `FESTIVAL_CHECKLISTS[match]` and inserts each as a `tasks` row via `supabase.from("tasks").insert({ household_id, created_by: user.id, title, status: 'pending', due_date: festivalDateMinus1 })`. Then dismisses the banner and toasts `"Added N tasks. Open Taskmaster ▸"`.

**Mount.** Render `<FestivalBanner />` in `src/pages/Index.tsx` directly above the Family Pulse section (between `PendingInvitationBanner` and the heading), because that area already hosts other awareness banners.

### Files

**Migration (one):**
- `manual_calendar_events`: add `repeat_type`, `member_ids`, `is_system_generated` + restrictive policies.
- New `system_calendar_events` + RLS + seed for 2026/2027 (insert ... on conflict do nothing; unique on `(name,event_date)`).

**New:**
- `src/data/festivalChecklists.ts`
- `src/hooks/useUpcomingFestival.ts`
- `src/components/dashboard/FestivalBanner.tsx`

**Edited:**
- `src/components/calendar/CreateEventDialog.tsx` — add Repeat select + Who checklist; relabel Description→Notes.
- `src/hooks/useManualCalendarEvents.ts` — accept and persist `repeat_type` + `member_ids`.
- `supabase/functions/fetch-calendar-events/index.ts` — recurrence expansion + system events merge.
- `src/components/calendar/CalendarGrid.tsx` — dot rendering for `calendarId === 'system'` events with tooltip; suppress event-click routing through to dialog.
- `src/components/calendar/CalendarLegend.tsx` — Festivals + National holidays rows.
- `src/pages/Calendar.tsx` — guard `onEventClick` against system events.
- `src/pages/Index.tsx` — mount `<FestivalBanner />`.

### Out of scope

- Per-member event filtering UI on the calendar grid (just persisting `member_ids` for now).
- Re-seeding future years automatically (admins re-run a small script when a new year's variable dates are known).
- Editing system events into household-local copies.
- WhatsApp push for upcoming festival (banner only).