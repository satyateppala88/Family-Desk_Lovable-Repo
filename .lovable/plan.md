## Goal
At tablet breakpoint (≥768px) make the calendar use the available space, fix non-tappable "+X more" pills, and add a Day Detail panel/sheet. Mobile (<768px) layout stays untouched.

## Context
- `useIsMobile()` returns true below 768px. The CalendarGrid agenda view is only used on mobile, so the "desktop" branch is what tablets render today — this is where the styling tweaks need to land.
- F-17 already wired `onSelectDate` for both render paths, so Bug 3 is mostly verification + ensuring it also opens the new detail panel.
- BottomNav is currently a floating pill until `lg` (1024px). Need to swap to a flush full-width bar at `md` (768–1023px), keep pill on mobile.

## Changes

### 1. New component: `src/components/calendar/DayDetailSheet.tsx`
A responsive Sheet (shadcn) that shows ALL events for a selected date.
- `<768px`: `side="bottom"` (rounded-t-2xl, ~75vh max-height, scrollable list).
- `≥768px`: `side="right"`, width 320px, full height, slides over the grid (not modal — backdrop transparent, dismiss on outside click and X).
- Header: `[EEEE], [d MMM]` (e.g., "Monday, 27 April") + `N event(s)` count + close X button.
- Body: events sorted by start time ascending with all-day events first.
  - Each row: 3px left color strip, full title (no truncation), time line `h:mm a – h:mm a` or "All day", and member chip (derive from `event.calendarOwner` if present).
  - System events render as muted dot rows (consistent with grid).
- Empty state: "Nothing scheduled".
- Props: `open`, `onOpenChange`, `date: Date`, `events: CalendarEvent[]`, `onEventClick(ev)`.

### 2. `src/components/calendar/CalendarGrid.tsx`
Add new prop `onOpenDay: (date: Date) => void`. Apply tablet styling at `md:` breakpoint inside the existing desktop grid branch (which is what tablets render).

Per spec on the desktop grid:
- Cell: `min-h-[72px] md:min-h-[100px]`, `p-1 md:p-1` (4px); change `onClick` to call `onOpenDay(day)` (which internally also sets selectedDate).
- Day number: position top-right with `md:text-[15px]` and `md:p-1.5`. Keep selected/today highlight (already wired).
- Event chips: `md:h-[22px] md:text-[11px] md:px-2`, no truncate clamp (use `truncate` only as final fallback). Keep slice(0, 3).
- "+N more" element: convert from `<div>` to `<button type="button">` with `onClick={(e) => { e.stopPropagation(); onOpenDay(day); }}`. Style as small underline link, tappable target ≥32px.
- Week-day header row: `md:text-[13px] md:pb-1`.
- Mobile agenda branch: unchanged.

### 3. `src/pages/Calendar.tsx`
- Add state `dayDetailOpen` (default false).
- Define `openDayDetail(date)` that calls `setSelectedDate(date)` and `setDayDetailOpen(true)`. Pass it to `CalendarGrid` as `onOpenDay`.
- Render `<DayDetailSheet open={dayDetailOpen} onOpenChange={setDayDetailOpen} date={selectedDate} events={selectedDateEvents} onEventClick={...} />`.
- Keep the inline events-list section (from F-17) — it remains the default mobile/tablet snapshot under the grid; the sheet is the "see all" view.

### 4. `src/components/layout/BottomNav.tsx`
Rework the wrapper so:
- `<md` (mobile): existing floating pill — keep classes as-is.
- `≥md` and `<lg` (tablet): flush full-width bar
  - `fixed bottom-0 left-0 right-0`, no margin, no rounded corners
  - Height 60px, background `#0F6E56`, items centred
  - Icons + labels visible (use existing labels)
- `≥lg`: hidden (unchanged).

Implement by rendering two `<nav>` siblings under the same `<>` fragment with mutually exclusive Tailwind visibility classes (`md:hidden` for the pill, `hidden md:flex lg:hidden` for the flush bar) so the two layouts don't fight CSS. Both reuse the same `PRIMARY` array and More handler.

### 5. Verification
- `bunx tsc --noEmit`.
- Browser test at 390 (mobile) and 820 (tablet) viewports: confirm date tap highlights + opens panel; "+X more" opens panel with full list; chips render at proper size on tablet; bottom nav switches form factor.

## Out of Scope
- Event creation flow, Connect Google Calendar dialog, data fetching hooks.
- Mobile agenda layout in CalendarGrid.
- Desktop (≥1024px) — currently no bottom nav by design; not changing.