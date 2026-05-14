## Meal slot 400 — investigation + fix

### What I found

1. **Unique constraint already exists.** `meal_plans_household_id_week_start_date_key UNIQUE (household_id, week_start_date)` is live in the DB, so the upsert's `onConflict: "household_id,week_start_date"` resolves correctly. Phase 0's Fix 4 is a no-op against the current schema.
2. **`useMealPlans.createMealPlan` has zero callers.** `rg createMealPlan` only matches its own definition. The hook the meal-slot UI actually uses is `src/lib/meals/assignRecipeToSlot.ts`, called from `Meals.tsx`, `AddMealSheet.tsx`, and `AiSuggestSheet.tsx`. Whatever 400 the user sees is coming through `assignRecipeToSlot`, not `createMealPlan`.
3. **Real 400 cause: `meal_plans.created_by` is NOT NULL with no default.**
   - `assignRecipeToSlot` already passes `created_by: userId` ✔.
   - The current `useMealPlans.createMealPlan` body **and** the snippet the user pasted both omit `created_by`, so even after we apply the spec verbatim a brand-new-week upsert will still 400 with `null value in column "created_by" violates not-null constraint`.

### What to change

#### A. `src/hooks/useMealPlans.ts` — apply the spec, plus required `created_by`

The body in the file already matches the user's snippet line-for-line (upsert → delete → insert → invalidate on success). The only edits needed:

1. Pull the auth user (`import { useAuth } from "@/contexts/AuthContext"; const { user } = useAuth();`) and add `created_by: user.id` to the upsert payload so the NOT NULL column is satisfied. Throw early if `user?.id` is missing.
2. Leave the existing `onSuccess` `queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] })` and toast in place — that already matches the spec. (No "close meal slot sheet" lives in this hook; sheet open state is owned by `Meals.tsx`, see B.)
3. No other behaviour changes.

#### B. Sheet-close behaviour (already correct, just verify, no edit)

- `AddMealSheet.tsx` already calls `onOpenChange(false)` after a successful `assignRecipeToSlot`.
- `AiSuggestSheet.tsx` already calls `onOpenChange(false)` after assign.
- `Meals.tsx` `handleAssignFromBrowser` already calls `setBrowserOpen(false)` and invalidates `["meal-plans", householdId]`.

No edits needed in the sheet components — the spec's "close the meal slot sheet on success" is already satisfied along the live path.

#### C. No DB migration

The unique constraint is already in place. Nothing to add for Phase 0 Fix 4.

### Out of scope
- `assignRecipeToSlot` (works correctly today, no change needed).
- The Phase 0 SQL — Fix 4 is already represented in the live schema; no new migration.
- Any other meal-related logic (cooking, pantry deduction, exports).

### Verification
1. From a week with no existing plan, open a meal slot → AI Suggest → pick a recipe. Network tab shows 201 (not 400) for `meal_plans` and `meal_plan_items`. Sheet closes, slot fills.
2. Repeat on the same week with a different slot — upsert returns the existing plan row (no constraint error), new item inserted.
3. Manually invoke `createMealPlan.mutateAsync({ weekStartDate, items: [...] })` (e.g. via a temporary devtool call) — succeeds end-to-end, no NOT NULL error on `created_by`, query cache refreshes.