# Fix duplicate onboarding, meal-slot fetch error, weekly habits, realtime leak

## 1. Duplicate onboarding — Task Planning vs Routine setup

**Cause:** `habits_setup` and `tasks_setup` both render `RoutineSetupForm` with identical questions (`preferred_task_time`, `household_concerns`) and are tracked separately. Enabling both modules surfaces two identical modals.

**Fix (collapse "tasks_setup" into "habits_setup"):**

- `src/lib/moduleSetup.ts`
  - Remove `"tasks_setup"` from the `ModuleSetupKey` union, `MODULE_SETUP_FIELDS`, `MODULE_SETUP_META`, `MODULE_TO_FEATURE_TOUR`.
  - Re-map `tasks` in `MODULE_SETUP_KEYS` to `"habits_setup"` so the Settings progress card and SetupQueue treat tasks setup as covered by the routine setup.
- `src/pages/TaskmasterToday.tsx`
  - Change `<ModuleSetupGate module="tasks_setup">` → `<ModuleSetupGate module="habits_setup">`. The shared `preferred_task_time` value is what task planning already consumes.
- `src/components/onboarding/ModuleSetupGate.tsx`
  - In the form-routing `switch`, drop the `case "tasks_setup":` line; only `case "habits_setup":` remains, still rendering `RoutineSetupForm`.
- `src/components/onboarding/ModuleSetupGate.test.tsx` — remove any reference to `tasks_setup` if present (run vitest after to confirm).

Existing data: previously stored `completed_module_setups.tasks_setup` flags become harmless dead keys; no migration needed.

## 2. Meal Plan "Add breakfast" → "Failed to update preferences: TypeError: Failed to fetch"

**Cause hypothesis:** `handleAddClick` itself is pure UI state, but the Meals page is wrapped in `ModuleSetupGate module="meals_setup"`, which uses `useModuleSetup`. That hook's auto-backfill effect calls `updatePreferences({ completed_module_setups: ... })` once `preferences` loads. If that mutation fires while `householdId` is briefly stale, or if a prior optimistic mutation's network call is rejected, the global toast `Failed to update preferences: TypeError: Failed to fetch` surfaces — and the timing often coincides with the user's first interaction (the click). The handler that opens the recipe browser is misattributed.

**Fix (defensive, no behaviour change):**

- `src/hooks/useModuleSetup.ts`
  - Guard the auto-backfill effect: only call `markComplete.mutate()` once per session per key (already implicit via `completed?.[key]` check, but add a `useRef` latch to prevent re-fires when react-query refetches `preferences`).
  - Wrap the `markComplete.mutate()` in a `.catch(() => {})` so a transient network blip does not surface a user-visible toast for a silent backfill.
- `src/hooks/useHouseholdPreferences.ts`
  - In the mutation, if `!householdId`, return early without throwing (silent no-op) and do **not** show a toast. This prevents the "Failed to update preferences" toast in the no-household race window.
  - Distinguish network errors: when `error.message === "Failed to fetch"` show a friendlier `"You appear to be offline — changes will sync when reconnected."` instead, and skip the toast entirely for the silent backfill path (handled by point above).
- No edits to `Meals.tsx`, `MealPlanCalendar.tsx`, or `RecipeBrowserSheet.tsx` — they are not the source of the network call.

If after these guards the error still reproduces specifically on Add-meal click, we will instrument the click handler with a `console.trace` to capture the real call site; but the codebase audit shows no fetch is currently issued from that path.

## 3. Weekly habits showing every day

Replace the `todaysHabits` filter block in `src/hooks/useHabits.ts` exactly as specified by the user:

```ts
const todaysHabits = habitsWithStreaks.filter((habit) => {
  const todayDayOfWeek = new Date().getDay();
  if (habit.frequency_type === 'daily') return true;
  if (habit.frequency_type === 'specific_days') {
    return habit.frequency_days.includes(todayDayOfWeek);
  }
  if (habit.frequency_type === 'weekly') {
    if (habit.frequency_days && habit.frequency_days.length > 0) {
      return habit.frequency_days.includes(todayDayOfWeek);
    }
    return todayDayOfWeek === 1;
  }
  return true;
});
```

## 4. Realtime subscription channel leak

Replace the entire content of `src/hooks/useRealtimeSubscription.ts` with the implementation provided in the request (signature-hashed channel name + correct dependency array).

## Verification

- `bunx vitest run` to ensure ModuleSetupGate tests still pass.
- Manual: enable both Habits and Tasks for the test household and confirm only one Routine setup modal appears, and that completing it doesn't re-prompt on the Taskmaster page.
- Manual: open `/meals`, click "Add breakfast", confirm the recipe browser opens and no error toast appears.
- Manual: create a weekly habit with `frequency_days = [3]` and confirm it appears only on Wednesday.
- Manual: navigate between pages with realtime hooks and confirm no `mismatch in channel.subscribe` console warnings.

No DB migrations, no edge function changes.
