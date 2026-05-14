## Four small fixes

### FIX 1 — Hide "Log your first expense" tip when transactions exist
**File:** `src/pages/Finance.tsx`

Wrap the `<ModuleNudgeBanner moduleKey="finance" …>` (lines 106–109) in a conditional that only renders when `summary?.transactionCount` is `0`. While `summary` is still loading (`isLoading`), don't render the tip either — avoids a flash for households that already have transactions.

```tsx
{!isLoading && (summary?.transactionCount ?? 0) === 0 && (
  <ModuleNudgeBanner moduleKey="finance" text="Log your first expense …" />
)}
```

### FIX 2 — Stop ghost "Preferences updated!" toast on `/taskmaster/tasks`
**Root cause:** `useModuleSetup` (in `src/hooks/useModuleSetup.ts`) auto-fires `markComplete → updatePreferences({ [typedColumn]: true })` on mount when `hasRequiredData` is true. The hook comment says "Silent backfill — never surface a toast", but `useHouseholdPreferences.updatePreferences` always fires `toast.success("Preferences updated!")` in `onSuccess`. So every visit to a page wrapped by `ModuleSetupGate` (Tasks, Today, etc.) emits the toast on first load until the boolean column is set.

**Fix in `src/hooks/useHouseholdPreferences.ts`:**
- Change the mutation to accept an optional `silent` flag. Easiest: switch the `mutationFn` input from `Partial<HouseholdPreferences>` to `{ updates: Partial<HouseholdPreferences>; silent?: boolean }`, and skip the `toast.success(...)` in `onSuccess` when `silent` is true. Update the public `updatePreferences` wrapper to keep its current signature (toast on by default), and add an internal call site that passes `silent: true`.
- Simpler alternative (preferred — fewer call-site changes): give the returned function an optional second arg: `updatePreferences(updates, { silent?: boolean })`. Internally call `mutateAsync({ updates, silent })`. All existing callers keep working unchanged.

**Fix in `src/hooks/useModuleSetup.ts`:**
- In `markComplete.mutationFn`, pass `{ silent: true }` to `updatePreferences(...)` for both branches (the boolean-column write and the jsonb write). This is the only place that does background backfills.

No other call sites need changes — Settings, ModuleSetupGate finalize, etc. legitimately want the toast.

### FIX 3 — Submit buttons placed mid-form in Subscription / Event modals
**Files:** `src/components/finance/SubscriptionDialog.tsx`, `src/components/calendar/CreateEventDialog.tsx`

Both dialogs already pass the submit button via `BottomSheet`'s `footer` prop, which renders a `sticky bottom-0` bar at the bottom of the sheet, so the button structurally sits below all fields. The user-reported behavior most likely comes from one of two things:

1. On mobile, the on-screen keyboard pushes content but the sheet footer scrolls with the content area, causing the button to appear over a field rather than at the visual bottom.
2. The form is taller than `max-h-[90dvh]`, so the user scrolls and sees fields below where the sticky bar is anchored.

Plan:
- Confirm button is the last DOM node in the form container (already is) — no reorder needed.
- Ensure the scrollable content area in `BottomSheet` has bottom padding so the last field isn't covered by the sticky footer. In `src/components/ui/BottomSheet.tsx`, change the scroll wrapper `px-4 py-4` to `px-4 pt-4 pb-6` (or add `pb-24` only when `footer` is present) so the final field clears the sticky button on small screens.
- In `SubscriptionDialog`, move the `Active` switch (currently after Notes) to immediately under `Name` so the "create" affordance is closer to the primary identifying field, and Notes/Tags remain the last "secondary" inputs before the sticky Save button. (Reorder only — no logic change.)
- In `CreateEventDialog`, the children order already ends with `Notes`. Leave field order as-is; the padding fix above is enough.

If after the padding fix the user still reports the button appearing mid-form, we'll need a screenshot to confirm what they're seeing, since the code path produces a sticky-bottom button.

### FIX 4 — Habits "AI Coach Insight: Add your first habit" shows with existing habits
**File:** `src/pages/Habits.tsx` (around lines 89, 262)

Current condition renders `neutralCoachCopy` (the "Add your first habit…" text) whenever `totalCount === 0 || completedCount === 0 || householdTooNew`. So a household with habits but none completed yet today still sees the "Add your first habit" copy.

Fix:
- Only show the "Add your first habit…" copy when `totalCount === 0`.
- When `totalCount > 0` and `completedCount === 0` (and not too new), show a different contextual line, e.g. `"Tap a habit below to log your first check-in for today."`.
- Keep the existing "You're making progress!" branch for partial completion.
- Keep the `householdTooNew` neutral copy but switch its text to a welcoming line that doesn't claim there are no habits, e.g. `"Your household is just getting started — take a moment to set up the routines that matter."`.

Concrete change:
```tsx
const emptyCoachCopy = "Add your first habit to start tracking your household's daily routine.";
const startTodayCopy = "Tap a habit below to log your first check-in for today.";
const newHouseholdCopy = "Your household is just getting started — take a moment to set up the routines that matter.";

{totalCount === 0 ? (
  <HabitCoachInsight content={emptyCoachCopy} onDismiss={() => {}} />
) : householdTooNew ? (
  <HabitCoachInsight content={newHouseholdCopy} onDismiss={() => {}} />
) : completedCount === 0 ? (
  <HabitCoachInsight content={startTodayCopy} onDismiss={() => {}} />
) : completedCount < totalCount ? (
  <HabitCoachInsight content="You're making progress! Keep the momentum going — every check-off counts." onDismiss={() => {}} />
) : null}
```

### Files touched
- `src/pages/Finance.tsx`
- `src/hooks/useHouseholdPreferences.ts`
- `src/hooks/useModuleSetup.ts`
- `src/components/ui/BottomSheet.tsx`
- `src/components/finance/SubscriptionDialog.tsx` (field reorder only)
- `src/pages/Habits.tsx`
