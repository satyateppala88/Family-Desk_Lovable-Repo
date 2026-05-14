## Setup modal re-appears on every visit — fix

### Root cause

The setup modal already writes `completed_module_setups[<key>] = true` to `household_preferences` (a `jsonb` column) when the user clicks "Set up now" or "Skip". The DB confirms this works for some households. But the modal still re-prompts because of two bugs in the gate logic:

1. **`isLoading` ignores stale-cache misses.** `useHouseholdPreferences` returns `null` from cache before the row is fetched and `isLoading` is `false` if the query has been touched anywhere else first. `useModuleSetup` then evaluates `completed = {}` and `needsSetup = true`, mounting the dialog before the real preferences arrive. The dialog is on screen for a frame, then the data hydrates and it closes — but on slower connections or page-to-page navigations the user perceives it as "shows every visit".
2. **No row exists yet for some households.** When `household_preferences` has no row, the query returns `null` (PGRST116). `needsSetup` is `true` and the modal opens. Skip writes the row, but if the upsert response races the cache invalidation the gate can re-evaluate to `true` once before the new row is read back.

The user's prescription — explicit boolean columns and a hard pre-mount gate — eliminates both races by using a deterministic field per module.

### What to change

#### 1. Migration — add explicit boolean columns to `household_preferences`

Add three columns and backfill from the existing jsonb:

```sql
ALTER TABLE public.household_preferences
  ADD COLUMN IF NOT EXISTS finance_setup_complete  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grocery_setup_complete  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meals_setup_complete    boolean NOT NULL DEFAULT false;

UPDATE public.household_preferences
SET finance_setup_complete  = COALESCE((completed_module_setups->>'finance_setup')::boolean,  false),
    grocery_setup_complete  = COALESCE((completed_module_setups->>'grocery_setup')::boolean,  false),
    meals_setup_complete    = COALESCE((completed_module_setups->>'meals_setup')::boolean,    false);
```

The existing `completed_module_setups` jsonb is kept as-is — it still drives `habits_setup` and `calendar_setup` (which work today). No data is dropped.

#### 2. `src/lib/moduleSetup.ts`

Add a mapping from the 5 module keys to the boolean column name (or `null` for habits/calendar which keep using jsonb):

```ts
export const MODULE_SETUP_COLUMN: Record<ModuleSetupKey, keyof HouseholdPreferences | null> = {
  finance_setup:  "finance_setup_complete",
  grocery_setup:  "grocery_setup_complete",
  meals_setup:    "meals_setup_complete",
  habits_setup:   null,
  calendar_setup: null,
};
```

#### 3. `src/hooks/useModuleSetup.ts` — read/write the typed column when present

When `MODULE_SETUP_COLUMN[key]` is non-null:
- `isComplete = preferences?.[col] === true || hasRequiredData`.
- `markComplete` writes `{ [col]: true }` (single column, not jsonb merge).

When the column is `null`, fall back to the existing `completed_module_setups[key]` jsonb behaviour.

This isolates the three problem modules from the jsonb-merge race while keeping habits/calendar untouched.

#### 4. `src/components/onboarding/ModuleSetupGate.tsx` — pre-mount hard gate

Tighten the early return so the dialog is **never** mounted before preferences resolve:

```tsx
const { isLoading, needsSetup, ... } = useModuleSetup(module);
if (isLoading) return <>{children}</>;        // wait — don't mount the modal
if (!needsSetup) return <>{children}</>;
return (<>{children}<ModuleSetupDialog .../></>);
```

`useModuleSetup` already exposes `isLoading` from `useHouseholdPreferences` — surface it through the early-return so the dialog is not added to the DOM during the loading window. This satisfies the "check before render, never mount-then-hide" requirement.

#### 5. Types

`src/integrations/supabase/types.ts` regenerates automatically after the migration. `src/types/database.ts` (manual mirror) gets the three new fields added to `HouseholdPreferences`.

### Out of scope

- Habits and Calendar gates keep using the existing jsonb-key behaviour — they aren't reported as broken.
- The "Set up from Settings" entry point in `SetupProgressCard` continues to call `markComplete()`, which now updates the typed column, so the existing settings flow keeps working with no changes.

### Verification

1. Sign in as a fresh household → visit `/finance` → modal appears → click "Skip, I'll do this later" → reload → modal is gone. Repeat for `/grocery` and `/meals`.
2. Confirm `household_preferences.finance_setup_complete = true` after Skip.
3. Visit `/finance/trends` and `/finance/report` → no modal (gate sees the typed column).
4. Existing households with `completed_module_setups: {finance_setup:true, ...}` are not re-prompted (backfill handled it).