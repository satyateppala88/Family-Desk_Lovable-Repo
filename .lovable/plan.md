# Audit: Both requested patches already in place

I diffed the two requested replacements against the current code and they are byte-equivalent (modulo whitespace/comments). No file changes are needed.

## 1. `useFinanceTransactions` queryFn — already matches
`src/hooks/useFinance.ts` lines 142–172 already implement the exact requested logic:
- 500-row limit, ordered by `transaction_date desc`
- Month filter computed as `[YYYY-MM-01, nextMonth-01)` half-open range, with December → next-year January wrap
- `category` / `type` skip filter when value is `"all"`
- `description` ilike `%search%`

## 2. `createMealPlan` mutationFn — already matches
`src/hooks/useMealPlans.ts` lines 60–101 already implement the exact 3-step atomic-ish flow:
1. Upsert plan header on `household_id,week_start_date`
2. Delete prior `meal_plan_items` for that plan id
3. Insert new items (skipped when array empty)

Surrounding logic (success toast, summary email invocation, error toast) is preserved as in the existing code.

## What to do

Nothing — these fixes are already shipped from prior turns. If the user is still seeing wrong filter results or non-atomic meal-plan saves, the cause is downstream (e.g. cache invalidation, callers passing wrong `filters.month`, or RLS). Happy to investigate a specific failing scenario if the user can share repro steps or a screenshot.

No DB, edge function, or routing changes.
