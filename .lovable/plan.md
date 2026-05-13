## Goal

Stop the "Couldn't add" / "Error: …" toasts in Meals (and elsewhere) by:
1. Adding the missing unique constraint that the `meal_plans` upsert requires.
2. Replacing raw `error.message` text in mutation `onError` toasts across the app with short, friendly messages.

## Part 1 — Database migration

Confirmed via `psql`: `meal_plans` currently has only the primary key and FK constraints. The mutation in `useMealPlans.ts` calls `.upsert(..., { onConflict: "household_id,week_start_date" })`, which Postgres rejects without a matching unique constraint, surfacing as a "Couldn't add" / generic error toast.

Run a migration that adds:

```sql
ALTER TABLE public.meal_plans
ADD CONSTRAINT meal_plans_household_week_unique
UNIQUE (household_id, week_start_date);
```

Note: if duplicate `(household_id, week_start_date)` rows already exist they will block the constraint. The migration will pre-collapse duplicates by keeping the most recently updated `meal_plans` row per `(household_id, week_start_date)` and reparenting any `meal_plan_items` from the older rows before adding the constraint, so the upsert path is finally consistent.

## Part 2 — Friendly mutation error messages

Add a small helper `src/lib/friendlyError.ts`:

```ts
export function friendlyMutationError(fallback = "Something went wrong. Please try again.") {
  return fallback;
}
```

Then sweep mutation `onError` handlers and replace `description: error.message` (or `error.message || "..."`) with a short, plain-language message tailored to the action. The raw error stays in `console.error` for debugging. No business logic, no payload, no validation changes.

### Files to update (mutation onError handlers only — not form-level catch blocks unless they were already toasting raw DB errors)

Meals (priority — fixes the reported flow):
- `src/hooks/useMealPlans.ts` — 4 handlers → "Couldn't save meal plan. Please try again." / "Couldn't update this meal." / "Couldn't remove this meal." / "Couldn't delete this plan."
- `src/pages/Meals.tsx` lines 136, 172 → "We couldn't generate the meal plan. Please try again." / "Couldn't add this meal. Please try again."
- `src/components/meals/AddMealSheet.tsx`, `AiSuggestSheet.tsx`, `AddIngredientsDialog.tsx` — replace "Couldn't add" descriptions that pass `e.message` with a static "Please try again." string.
- `src/hooks/useRegenerateMeals.ts` → "Couldn't refresh meals. Please try again."

Grocery / Pantry:
- `src/pages/Grocery.tsx` (4 sites) → action-specific friendly text.
- `src/hooks/useShoppingLists.ts` (7 sites)
- `src/hooks/usePantryItems.ts` (4 sites)
- `src/hooks/usePantryCategories.ts` (1 site)

Tasks / Taskmaster / Habits / Recipes:
- `src/hooks/useTasks.ts` (3)
- `src/hooks/useTaskmaster.ts` (6)
- `src/hooks/useHabits.ts` (3)
- `src/hooks/useRecipes.ts` (3)

Auth / Account / Household / Admin (mutation toasts only — keep auth-screen messages where the user *needs* to know which credential failed; replace generic catch-all toasts):
- `src/pages/AccountSettings.tsx` (2)
- `src/pages/HouseholdSetup.tsx` (1) — keep current fallback string, drop `error.message`.
- `src/pages/HouseholdProductSettings.tsx` (2)
- `src/pages/AdminAccessRequests.tsx` (2)
- `src/pages/RequestAccess.tsx` (1)
- `src/pages/Auth.tsx` (3) — **keep** the surfaced message because users genuinely need "Invalid login credentials" / "Email not confirmed" feedback. Out of scope.
- `src/components/voice/VoiceInputButton.tsx` — already shows a friendly fallback; keep.

For each replaced site, pattern is:

```ts
onError: (error) => {
  console.error("<context> error:", error);
  toast({
    title: "<short title>",
    description: "<friendly action-specific message>",
    variant: "destructive",
  });
},
```

## Verification

1. Migration applies cleanly (constraint visible in `pg_constraint`).
2. Reload Meals → click "Use this" on an AI dinner suggestion → meal saves, grid updates, no "Couldn't add" toast.
3. Trigger a failure (e.g. temporarily revoke RLS in a test) → user sees only the friendly toast; raw error appears only in the browser console.

## Out of scope

- Auth screen specific error surfacing (intentional UX).
- Refactoring non-mutation try/catch blocks that already display friendly text.
- Editing the auto-generated `src/integrations/supabase/types.ts`.
