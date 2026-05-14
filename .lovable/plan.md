## /tasks shows wrong setup modal — fix

### Root cause
`src/pages/TaskmasterToday.tsx` wraps its export in `<ModuleSetupGate module="habits_setup">`. That makes the Habits setup modal pop on `/tasks` (and every Taskmaster sub-route that re-uses this page wrapper).

`src/lib/moduleSetup.ts` also reinforces the wrong mapping at `MODULE_SETUP_KEYS.tasks = "habits_setup"`, used by `SetupProgressCard` to surface a "Tasks setup" entry that actually opens the Habits questionnaire.

### What to change

1. **`src/pages/TaskmasterToday.tsx`** — remove the `ModuleSetupGate` wrapper entirely. Per the spec there is no Tasks setup, so `/tasks` (and the rest of the Taskmaster sub-nav that mounts this page) should render with no setup modal. Export `TaskmasterToday` directly.

2. **`src/lib/moduleSetup.ts`** — drop `tasks` from `MODULE_SETUP_KEYS` (or map it to `null`) so callers like `SetupProgressCard` no longer treat the Tasks product as needing the Habits questionnaire. `ProductName` includes `tasks`, so the mapping becomes `Partial<Record<ProductName, ModuleSetupKey>>` and downstream code that iterates the map already handles missing entries (it filters by enabled products and reads the meta by key — both safe for an absent entry).

3. **`src/components/settings/SetupProgressCard.tsx`** — verify it tolerates `MODULE_SETUP_KEYS[product]` being `undefined` for `tasks` (skip the row if missing). Adjust only if needed to avoid rendering an "undefined" setup card.

No other gates change:
- `/habits` already uses `habits_setup` ✔
- `/finance` (+ trends/report) uses `finance_setup` ✔
- `/grocery` uses `grocery_setup` ✔
- `/meals` uses `meals_setup` ✔
- `/calendar` uses `calendar_setup` ✔ (out of the user's list but already correctly scoped)

### Out of scope
- Form logic, mutation calls, save/skip handlers, and the new typed-column persistence from the previous fix all stay exactly as they are.

### Verification
1. Sign in as a fresh household → visit `/tasks` → no setup modal appears.
2. Visit `/habits` → Habits setup modal appears (unchanged behaviour).
3. Visit `/finance`, `/grocery`, `/meals` → each shows its own module's modal only.
4. Open Settings → "Setup progress" → no broken/duplicate "Tasks" row.