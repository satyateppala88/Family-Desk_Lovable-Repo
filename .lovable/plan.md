# BUG-FIX-D1 & D2 — Implemented

- D1: Event form already uses shared DatePicker (auto-closes). No change needed.
- D2 Issue 2: `fetch-calendar-events` now exposes `recurrence`, `memberIds`, `exceptionDates`, `parentEventId`, `occurrenceDate`. Edit form's RecurrencePicker initialises from `event.recurrence` correctly.
- D2 Issue 1: New `RecurrenceEditScopeDialog` (this / future / all). `Calendar.tsx` shows it before opening edit for recurring events. `CreateEventDialog` accepts `recurrenceScope` and routes to new `useUpdateRecurringEvent` mutation. New migration adds `parent_event_id` and `exception_dates` columns to `manual_calendar_events`.
