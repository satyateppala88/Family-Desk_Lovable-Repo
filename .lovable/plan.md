## Refactor `createMealPlan` mutationFn in `src/hooks/useMealPlans.ts`

Replace lines 67–113 (the entire body of the `mutationFn`) with the upsert-based flow:

1. Upsert plan header on `(household_id, week_start_date)` — safe if it already exists.
2. Delete existing items for that plan id.
3. Insert new items mapped with `meal_plan_id`.
4. Return `mealPlan`.

Removes the prior delete-then-insert of the plan row (which broke FK references) in favor of a stable plan id reused across saves. Requires a unique constraint on `(household_id, week_start_date)` — already implied by the existing dedup logic. No changes to onSuccess/onError or any other code.