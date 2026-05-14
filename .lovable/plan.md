## Calendar event edit/delete + all-day default

### Fix 1 — Add Edit & Delete on the event detail popup
Manual events come back from `fetch-calendar-events` with `calendarId: "manual"` and a synthetic id like `manual-<uuid>-YYYY-MM-DD`. We need the underlying DB row id to mutate, plus mutations and UI.

1. **Edge function `supabase/functions/fetch-calendar-events/index.ts`** — when emitting manual events (around line 310), also include `manualEventId: ev.id`.
2. **`src/hooks/useCalendarEvents.ts`** — extend `CalendarEvent` with optional `manualEventId?: string`.
3. **`src/hooks/useManualCalendarEvents.ts`** — add `useUpdateManualEvent` and `useDeleteManualEvent`. Both reuse the same start/end derivation as create, write to/delete from `manual_calendar_events`, and on success invalidate `["calendar-events"]` and `["today-events"]`.
4. **`src/components/calendar/CreateEventDialog.tsx`** — accept optional `eventToEdit?: CalendarEvent`. When provided:
   - Title becomes "Edit Event", footer button becomes "Update Event".
   - On open, pre-fill `title`, `description`, `date` from `event.start`, `time` from `event.start` (HH:mm) when `!allDay`, and `allDay` from `event.allDay`. (Repeat / member fields aren't edited in this iteration; preserve existing values by sending only fields the form changes.)
   - Submit calls `useUpdateManualEvent` with `manualEventId` instead of `useCreateManualEvent`.
5. **`src/components/calendar/CalendarEventDialog.tsx`** — when `event.calendarId === "manual"`, render two icon buttons (pencil = `Pencil` lucide icon, trash = `Trash2`) in the header next to the existing close (`X`).
   - Pencil → close detail dialog and open `CreateEventDialog` in edit mode.
   - Trash → open the existing `ConfirmDialog` ("Delete this event?", confirm label "Delete"), then call delete mutation; on success close popup and toast "Event deleted".
6. **`src/pages/Calendar.tsx`** — manage `editingEvent` state, render `CreateEventDialog` with `eventToEdit` when set, and pass an `onEdit` / `onDelete` from `CalendarEventDialog`.

### Fix 2 — All-day by default when no time entered
1. **`src/hooks/useManualCalendarEvents.ts` (create + update)** — when `!input.time`, force `all_day: true` (in addition to existing midnight-to-midnight start/end). This persists the truth: an event saved without a time is an all-day event.
2. **`src/components/calendar/CalendarGrid.tsx`** — mobile list view currently shows an "All day" caption for `event.allDay`. Drop the caption so all-day events show just the title (matching spec); time-prefixed events keep their `h:mm a` line. Desktop view already shows just the title for all-day events — no change.
3. The detail popup already conditionally hides the time row for `allDay`, so no change there beyond adding the action buttons.

### Verification
- Create event without picking a time → grid shows just the title (no "12:00 AM"); detail popup shows date only.
- Click an existing manual event → detail popup shows Edit + Delete icons.
- Edit → form opens pre-filled, button reads "Update Event"; saving updates the row and grid refreshes.
- Delete → confirm dialog appears; confirming removes the event from the grid immediately and toasts success.
- Google/system events: detail popup remains read-only (Edit/Delete only appear for `calendarId === "manual"`).