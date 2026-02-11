

# Calendar-to-Tasks: Smart Task Extraction Button

Add a "Scan Calendar" button to the Taskmaster Dashboard that reviews upcoming calendar events and generates a preview of suggested tasks for the user to approve before they are created.

---

## Current Behavior

The existing `extract-calendar-tasks` edge function already does the heavy lifting: it fetches calendar events, uses AI to identify actionable items (e.g., "Call dentist"), filters out meetings/appointments, and inserts tasks directly into the database. However, it only runs silently as part of the daily plan generation -- users have no direct control and no chance to review before tasks are created.

## What Changes

### 1. Two-Step Flow: Preview, Then Confirm

Instead of auto-creating tasks, introduce a review step:

1. User clicks **"Scan Calendar"** button on the Dashboard
2. A dialog opens showing a loading state while the AI analyzes calendar events
3. The dialog displays suggested tasks with title, priority, category, and AI reasoning
4. User can **check/uncheck** individual tasks, **edit titles**, or **change priority/category** before confirming
5. Only confirmed tasks are created in the database

### 2. Date Range Selection

Rather than only scanning today, let users pick a date range (Today, This Week, Next 7 Days) to catch upcoming actionable items early -- e.g., "Renew car insurance" scheduled for next Thursday can become a task today.

### 3. Duplicate Detection Badge

Show a "Already imported" badge on events that were previously converted to tasks (using the existing `source_calendar_event_id` tracking), so users know what has already been handled.

### 4. Calendar Connection Check

If no Google Calendar is connected, the button shows a helpful prompt to connect one first, linking to the Calendar page.

---

## Technical Plan

### New Edge Function: `extract-calendar-tasks-preview`

A variant of the existing function that returns suggested tasks **without inserting them** into the database. This keeps the existing auto-insert function untouched.

- Accepts `{ householdId, startDate, endDate }`
- Fetches events via `fetch-calendar-events`
- Checks existing `source_calendar_event_id` for duplicates
- Calls AI to identify actionable tasks
- Returns `{ suggestions: [...], alreadyImported: [...] }` without any database writes

### New Component: `CalendarTaskScanDialog`

**File: `src/components/taskmaster/CalendarTaskScanDialog.tsx`**

A dialog with:
- Date range selector (Today / This Week / Next 7 Days)
- Loading state with "Scanning your calendar..." message
- List of suggested tasks, each with:
  - Checkbox (default checked)
  - Editable title field
  - Priority dropdown (P1-P4)
  - Category dropdown (Home/Work/Kid/Other)
  - AI reasoning shown as a subtle tooltip
  - "Already imported" badge for duplicates (unchecked by default)
- "Create X Tasks" confirmation button
- "Cancel" button

### Update: `TaskmasterDashboard.tsx`

- Add a "Scan Calendar" button in the header area next to the Dashboard title
- Button shows a Calendar + Sparkles icon
- Opens the `CalendarTaskScanDialog`
- After tasks are created, invalidates the `taskmaster-tasks` query to refresh stats

### Update: `useTaskmaster.ts`

- Add a `createMultipleTasks` mutation that batch-inserts the confirmed tasks
- Reuses the existing insert logic but accepts an array

---

## Summary

| Item | Details |
|------|---------|
| New edge function | `extract-calendar-tasks-preview` -- returns suggestions without DB writes |
| New component | `CalendarTaskScanDialog` -- review dialog with edit capability |
| Updated page | `TaskmasterDashboard.tsx` -- add Scan Calendar button |
| Updated hook | `useTaskmaster.ts` -- add batch create mutation |
| Config | Add function to `supabase/config.toml` with `verify_jwt = false` |

