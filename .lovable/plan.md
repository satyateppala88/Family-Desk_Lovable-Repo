## Scope

Reshape the dashboard home (`src/pages/Index.tsx`) into a live-context layout with five sections. Reuse all existing data hooks; add only new presentation components and one tiny aggregation hook.

---

## Section 1 — Greeting + date (existing, lightly polished)

`src/pages/Index.tsx` already renders `greeting` and `household.name`. Add the formatted weekday/date inline next to the household name: `Test Family · Wednesday, 13 May` using `format(new Date(), "EEEE, d MMM")`. No structural change.

---

## Section 2 — Today's snapshot (NEW)

New file: `src/components/dashboard/TodaySnapshot.tsx`.

- Horizontally scrollable row (`overflow-x-auto snap-x` with `scrollbar-hide`). Each card ~160×80, rounded-xl, brand-light surface, amber border + bg when `urgent`.
- One card per enabled product, gated by `useEnabledProducts`. Tap navigates to the spec'd path.
- New tiny aggregation hook: `src/hooks/useDashboardSnapshot.ts` — composes existing hooks (no schema/data-fetching changes):
  - **Tasks**: `useTaskmaster(householdId).tasks` → count `due_date` falling on today and overdue (`< startOfToday && task_status !== "done"`). Label `"{n} tasks due today — {x} overdue"` (omit overdue if 0). Urgent if overdue > 0.
  - **Dinner**: from `useDashboardStats.todayMeals`, find item with `meal_type === "dinner"` (fallback first). Show `"<recipe name> planned"` or `"Not planned yet"`.
  - **This month**: `useFinanceMonthlySummary(householdId)` for `expenses` and `useFinanceBudgets(householdId)` summed for monthly budget. `"₹{spent} spent — ₹{left} left in budget"` (fall back to "no budget set" copy when budget=0). Urgent if `spent > budget`.
  - **Habits**: `useHabits(householdId)` → `todaysHabits`, count `todayLog?.completed`. `"{done}/{total} done today"`. Urgent if `done === 0 && total > 0` past 6pm.
  - **Shopping**: `useShoppingLists(householdId)` → first active list, count items with `checked === false`. `"{n} items in list"` or `"List is empty"`.
- The hook returns `{ tasks, dinner, finance, habits, shopping }` with `{ label, urgent, path, icon, emoji }`.

---

## Section 3 — Festival / event nudge (extend existing)

Edit `src/components/dashboard/FestivalBanner.tsx`:

- Today the dismiss writes `localStorage[festival-banner-dismissed-{id}] = "1"` permanently. Switch to a timestamp: `JSON.stringify(Date.now())`. On read, hide only if `Date.now() - parsed < 3 * 24 * 3600 * 1000`. Spec-compliant 3-day re-show.
- Extend selector logic so this banner can also fire for "calendar event today/tomorrow":
  - New helper inside the same file (or `src/hooks/useNextNudge.ts`) reads `useCalendarEvents` filtered to next 48h. If no festival within 14 days but a manual/google event today/tomorrow exists, render variant: `"📅 {event title} {today|tomorrow} — open calendar?"` with single `[View]` button → `/calendar`. `[Dismiss]` reuses the same 3-day timestamp keyed by event id.
- Only one nudge at a time; festival takes precedence over event when both exist.

---

## Section 4 — Module grid (existing, live subtitles)

In `src/pages/Index.tsx`:

- Grid is already `grid-cols-2` on mobile — keep unchanged.
- Replace `getModuleHint` with subtitles fed by `useDashboardSnapshot` so all six modules show real data:
  - tasks → `"{n} due today"` (or `"All clear"` when 0)
  - meals → `"Dinner not planned"` or `"<recipe> for dinner"`
  - grocery → `"{items} items, {low} running low"` (low = pantry items where `quantity <= minimum_quantity` from a small inline call to `pantry_items`; if too costly, use `useDashboardStats.pantryItemsCount` only and skip "low" suffix when unknown)
  - calendar → `"{n} events this week"` from `useCalendarEvents` for current week range
  - habits → `"{done}/{total} done"`
  - finance → `"₹{spent} spent this month"` formatted via `formatINR`
- The current chip rendering stays; only the source string changes. Description fallback removed when a live subtitle is present.

---

## Section 5 — Quick actions row (NEW)

New file: `src/components/dashboard/QuickActionsRow.tsx`. Four equal-flex pill buttons.

- **+ Task** → opens `TaskmasterTaskDialog` (already exists) with `defaultProjectId=undefined`. On save, calls `useTaskmaster.createTask`.
- **+ Expense** → opens `TransactionDialog` (already exists). On save, calls `useCreateTransaction(householdId)`.
- **+ Habit** → opens `HabitCreateDialog` (already exists). Wires to `useHabits.createHabit`.
- **Ask AI** → dispatches `window.dispatchEvent(new CustomEvent("familydesk:open-ai"))`. Add a 3-line listener to `AIChatWidget.tsx` that calls `setIsOpen(true)` on this event. No other changes to the widget.
- Hidden per-product when that product is disabled in `useEnabledProducts`.
- Layout: 4-cols grid on mobile, with icon top, label bottom, h-14, brand-tinted hover.

---

## File summary

**New**
- `src/components/dashboard/TodaySnapshot.tsx`
- `src/components/dashboard/QuickActionsRow.tsx`
- `src/hooks/useDashboardSnapshot.ts`

**Edited**
- `src/pages/Index.tsx` — add weekday/date suffix, mount `TodaySnapshot` (replaces existing `FamilyPulse`), keep `FestivalBanner`, mount `QuickActionsRow`, swap module hint source to snapshot.
- `src/components/dashboard/FestivalBanner.tsx` — 3-day dismiss + calendar-event variant.
- `src/components/ai/AIChatWidget.tsx` — listen for `familydesk:open-ai` to set `isOpen=true`.

**Untouched data hooks**: `useDashboardStats`, `useFinance`, `useTaskmaster`, `useHabits`, `useShoppingLists`, `useCalendarEvents`, `useUpcomingFestival`. `useDashboardSnapshot` only composes them.

## Out of scope
- Reordering module cards by usage frequency.
- Drag-to-customize snapshot card order.
- Per-snapshot-card detail popovers (tap goes straight to the module per spec).
- Replacing the floating AI button — Quick Action just opens the same widget.