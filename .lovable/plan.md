
# BUG-FIX-D1 & D2 — Event form date picker + recurring edit flow

## Investigation summary

- **D1 (date picker auto-close)**: `CreateEventDialog.tsx` already uses the shared `DatePicker` from `src/components/ui/date-picker.tsx`, which already calls `setOpen(false)` on selection. No code change needed here unless QA reproduces the bug — in that case the only remaining variant is the unrelated Birthday/DOB picker. Will verify in preview after D2 changes and only revisit if reproducible.
- **D2 Issue 2 (repeat shows "Doesn't repeat")**: The edit form *does* read from `event.recurrence`, but `CalendarEvent` (returned by the `fetch-calendar-events` edge function) **never includes `recurrence`** — only `id, title, start, end, allDay, color, calendar*, location, description`. So `(eventToEdit as any).recurrence` is always `undefined` → picker shows "Doesn't repeat". Fix is to surface `recurrence` (and `memberIds`) from the edge function and the type.
- **D2 Issue 1 (no disambiguation dialog)**: Recurring events currently open the edit dialog directly. Need a new sheet that asks scope (`this | future | all`) and changes the save behaviour accordingly.
- **Schema gap for 'this' scope**: `manual_calendar_events` has no exception/parent columns. We need `parent_event_id uuid` and `exception_dates date[]` on the table, and the recurrence expander in the edge function must skip excepted dates and not re-expand child overrides.

## Changes

### 1. Database migration

Add to `public.manual_calendar_events`:
- `parent_event_id uuid` (nullable, FK → `manual_calendar_events(id) on delete cascade`) — marks an override/child event.
- `exception_dates date[] not null default '{}'` — dates to skip when expanding recurrence on the parent.

Index `(parent_event_id)` for child lookups. No RLS changes (inherits parent table policies).

### 2. Edge function `fetch-calendar-events`

- Include `recurrence`, `member_ids`, `repeat_type`, `parent_event_id`, `exception_dates` from the query.
- Map onto the response: `recurrence`, `memberIds`, `exceptionDates`, `parentEventId`.
- In `expandRecurrence`, skip any occurrence whose `yyyy-MM-dd` matches an entry in `exception_dates`.
- Children (override events with `parent_event_id != null`) are emitted as their own single-instance event (no expansion regardless of `repeat_type`).

### 3. `src/hooks/useCalendarEvents.ts`

Extend `CalendarEvent` interface with optional `recurrence: RecurrenceSpec | null`, `memberIds?: string[]`, `exceptionDates?: string[]`, `parentEventId?: string | null`, `occurrenceDate?: string` (derived: `yyyy-MM-dd` of the rendered occurrence — extracted from `id` suffix or added by edge fn).

### 4. `src/hooks/useManualCalendarEvents.ts`

Add new mutation helpers:
- `useUpdateRecurringEventScope({ id, scope, occurrenceDate, payload })`:
  - `all` → existing `useUpdateManualEvent` behaviour against parent id.
  - `this` → append `occurrenceDate` to parent's `exception_dates` AND insert a new one-off event (`repeat_type='none'`, `recurrence=null`, `parent_event_id=<parent>`, `start_at`/`end_at` derived from `occurrenceDate` + form values).
  - `future` → set parent's `recurrence.end` to `{ type: 'on_date', date: <day before occurrenceDate> }` and `repeat_type` unchanged; insert a new recurring event starting at `occurrenceDate` with the edited values (no `parent_event_id`).
- `useDeleteRecurringEventScope` (only `this` scope used by the existing dialog delete path — adds to `exception_dates` instead of deleting parent). `all` keeps current behaviour.

### 5. New component `src/components/calendar/RecurrenceEditScopeDialog.tsx`

Bottom sheet (reuse `BottomSheet`) with title "Edit recurring event", `RadioGroup` of `this | future | all` (default `this`), Cancel + Edit buttons. Pure presentational — calls `onSelect(scope)`.

### 6. `src/pages/Calendar.tsx`

- Add state `recurrenceScope: 'this' | 'future' | 'all' | null` and `pendingRecurringEdit: CalendarEvent | null`.
- In `onEdit` from `CalendarEventDialog`: if `ev.recurrence` is truthy, open `RecurrenceEditScopeDialog` instead of `CreateEventDialog`. After scope is chosen, open `CreateEventDialog` with the event and the chosen scope.

### 7. `src/components/calendar/CreateEventDialog.tsx`

- Accept new prop `recurrenceScope?: 'this' | 'future' | 'all'` (default `'all'` for non-recurring backward compatibility).
- Initialise `selectedMembers` from `eventToEdit.memberIds ?? members.map(...)` instead of always selecting all members.
- On submit when `isEdit && recurrenceScope && eventToEdit.recurrence`: call the new `useUpdateRecurringEventScope` mutation with the occurrence date (derived from `parseISO(eventToEdit.start)`) instead of `useUpdateManualEvent`.
- Existing recurrence-from-JSON read (`setRecurrence((eventToEdit as any).recurrence ?? null)`) now works because the edge function exposes it.

### 8. D1 verification

After the above, open the Event form in preview and tap the Date field; if the popover still doesn't close, the issue is elsewhere — investigate then. No speculative changes.

## Files

```
supabase/migrations/<new>.sql                                  (new)
supabase/functions/fetch-calendar-events/index.ts              (edit)
src/hooks/useCalendarEvents.ts                                 (edit)
src/hooks/useManualCalendarEvents.ts                           (edit)
src/components/calendar/RecurrenceEditScopeDialog.tsx          (new)
src/components/calendar/CreateEventDialog.tsx                  (edit)
src/pages/Calendar.tsx                                         (edit)
```

## Verification

1. Open existing weekly recurring event → scope sheet appears with "This event only" preselected → tapping Edit opens form with Title prefilled, **Weekly** chip selected, correct day chip selected, end condition prefilled.
2. Save with scope `this` → only that occurrence reflects the change in the grid; other occurrences unchanged.
3. Save with scope `future` → past occurrences unchanged; from selected date forward shows new values.
4. Save with scope `all` → every occurrence reflects the change.
5. Non-recurring event edit → scope sheet does **not** appear; existing flow intact.
6. Date picker in Event form closes immediately on date tap (re-verify D1).
