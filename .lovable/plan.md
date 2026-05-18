## Problem

The Calendar page shows connected calendars as chips in the header, with a small `×` button to disconnect. That `×` is styled `opacity-0 group-hover:opacity-100`, so on touch devices (the primary form factor) it is invisible and effectively unusable. There is also no single place to see *all* household calendars with who connected them, their account email, and a clear Disconnect action.

The underlying data and mutations already exist (`useCalendarConnections` → `connections`, `disconnectCalendar`, `updateConnection`). Only the UI surface is missing.

## Plan

1. **New component: `src/components/calendar/ManageCalendarsSheet.tsx`**
   - Bottom Sheet (shadcn `Sheet`, side="bottom") titled "Connected calendars".
   - Lists every `connection` from `useCalendarConnections()` for the household, showing:
     - color dot + `display_name`
     - `google_account_email` (muted)
     - "Connected by you" / member name if we can resolve it cheaply (otherwise just the email is enough for v1 — skip member lookup to keep scope small)
     - Eye/EyeOff toggle for `is_visible` (reuses `updateConnection`)
     - Always-visible "Disconnect" button (destructive, with `AlertDialog` confirm) calling `disconnectCalendar.mutate(connection.id)`
   - Empty state: "No calendars connected yet" + a button that triggers `onConnectCalendar` and closes the sheet.

2. **Wire it into `src/pages/Calendar.tsx`**
   - Add `const [showManageSheet, setShowManageSheet] = useState(false);`
   - Render `<ManageCalendarsSheet open={...} onOpenChange={...} onConnectCalendar={() => { setShowManageSheet(false); setShowConnectDialog(true); }} />`.

3. **Update `src/components/calendar/CalendarHeader.tsx`**
   - Add a new prop `onManageCalendars: () => void`.
   - Replace the "Connect" button with a "Calendars" button (Settings icon + label) that opens the manage sheet. Keep "Connect" reachable from inside the sheet (and from the existing empty-state CTA on the Calendar page).
   - In the chip strip, remove the hover-only `×` (keep visibility toggle on tap). Tapping any chip can also open the manage sheet for full controls — simpler and consistent on touch.

4. **No backend / hook changes** — `disconnectCalendar` and the safe view already return household-scoped connections.

### Technical notes
- Uses existing `Sheet`, `AlertDialog`, `Button` primitives. No new deps.
- All mutations already invalidate `["calendar-connections"]` and `["calendar-events"]`, so the list and grid refresh automatically.
- Touch-friendly: 44px hit targets, no hover-only affordances.

### Files
- add `src/components/calendar/ManageCalendarsSheet.tsx`
- edit `src/components/calendar/CalendarHeader.tsx`
- edit `src/pages/Calendar.tsx`
