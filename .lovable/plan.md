## What you reported

The "Quick setup for Finance / Grocery / Meals / Habits" modals (the bottom sheets that appear when you open a module page) keep re-appearing even after you've clicked **Skip** or **Set up now**.

## Why your proposed fix won't work

The `familydesk:module-setup-touched:{householdId}:{moduleKey}` localStorage key you spotted is **not** the gate that decides whether the modal shows. It's an internal helper used inside the questionnaire form to remember which individual questions the user has answered, so the "Step X of Y" progress bar restores correctly after a refresh. Changing it to a boolean would break that progress UI without affecting whether the modal opens.

The actual gate lives server-side. `useModuleSetup` checks `household_preferences.{module}_setup_complete` (a typed boolean column per module) and a few legacy fallbacks. When you click Skip or Set up now, the code already calls `markComplete()` which writes `true` into that column.

## The real bug

The DB write happens, but the modal can still flash on the next visit because:

1. **Cross-browser / incognito / fresh device** — localStorage is empty and the React Query cache is cold, so before the `household_preferences` fetch resolves, the gate briefly believes setup is incomplete. (Right now there's nothing client-side at all to short-circuit this.)
2. **Cache miss after sign-out / cache clear** — same race.
3. **Silent write failures** — if the upsert ever fails (RLS hiccup, transient network), nothing remembers the user's intent locally and the modal returns next visit.

In short: completion is tracked **only** on the server, with no local memory of "I already dismissed this", which is why even a successful skip can resurface the modal under any of the conditions above.

## Fix

Add a localStorage **completion** flag (separate from the existing `touched` progress key) and use it as a synchronous pre-render gate, in addition to the existing DB check. Belt-and-suspenders: if either source says "done", the modal stays closed.

### Changes

**1. New helper in `src/lib/moduleSetup.ts`**

Add two pure functions:

```text
moduleSetupLocalKey(householdId, key)  → "familydesk:module-setup-done:{householdId}:{key}"
isModuleSetupDoneLocally(householdId, key) → boolean   // reads localStorage === "true"
markModuleSetupDoneLocally(householdId, key)           // writes "true"
```

**2. `src/hooks/useModuleSetup.ts`**

- In `markComplete.mutationFn`, call `markModuleSetupDoneLocally(householdId, key)` synchronously **before** the async DB write. So even if the upsert later fails, the local flag is set.
- In the returned `isComplete` / `needsSetup` computation, OR-in `isModuleSetupDoneLocally(householdId, key)` so a true local flag immediately satisfies the gate.

**3. `src/components/onboarding/ModuleSetupGate.tsx`**

- Top of the `ModuleSetupGate` component, **before** the `if (isLoading)` early return, add a synchronous check: `if (isModuleSetupDoneLocally(householdId, module)) return <>{children}</>;`. This is the "happens before render" guard you asked for — no useEffect, no race.
- No other changes to the dismiss / skip / save flows. They already funnel through `markComplete`, which now also writes the local flag.

**4. Leave the existing `module-setup-touched` key alone.** It's serving a different purpose (in-form progress) and the form depends on it being an array.

### Behaviour after the fix

| Scenario | Before | After |
|---|---|---|
| User clicks Skip → reopens module page | Modal can re-flash if cache cold | Stays closed (local flag) |
| User clicks Set up now → saves → reopens | Same race possible | Stays closed |
| New browser / incognito | Modal opens (still no record) | Modal opens (correct — DB gate kicks in once preferences load) |
| Sign out / sign back in same browser | Modal could flash | Stays closed |
| User wants to redo setup | Re-run from Settings → Module Preferences (existing path, unchanged) | Same path — also clears the local flag there |

**5. `src/components/settings/ModulePreferencesSection.tsx`** (small follow-on)

Where the user can manually re-trigger a module setup from Settings, also `localStorage.removeItem(moduleSetupLocalKey(...))` so re-running setup actually shows the form again.

## Files touched

- `src/lib/moduleSetup.ts` — add 3 helpers
- `src/hooks/useModuleSetup.ts` — write local flag in `markComplete`, OR into `isComplete`
- `src/components/onboarding/ModuleSetupGate.tsx` — synchronous pre-render guard
- `src/components/settings/ModulePreferencesSection.tsx` — clear local flag when user manually reopens setup

No DB migration. No changes to the questionnaire forms or the touched/draft persistence.
