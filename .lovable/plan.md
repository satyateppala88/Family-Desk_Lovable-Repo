## Goal

Ensure the Finance UI updates immediately after any save, plus address the two related items from the request.

## Findings (current state)

I checked the actual code before planning:

1. **AI Advisor card already routes to `/finance/chat`** (`src/pages/Finance.tsx:74`). The route exists in `src/App.tsx:222` and renders `FinanceChat`. There is no `/finance/ai-advisor` reference anywhere in the codebase. **No change needed** — what the user saw as a 404 is no longer reproducible from code.

2. **Budget divide‑by‑zero is already guarded** in `src/pages/FinanceBudget.tsx`:
   - Per-row `pct` (line 88) uses `planned_amount > 0 ? … : 0`
   - The `<Progress>` bar and percent label are conditionally rendered only when `planned_amount > 0` (lines 171–185); otherwise it shows "No budget set".
   - The overall card (lines 138–145) does the same.
   - `FinanceBudgetAnnual.tsx` `heatColor()` returns early when `planned === 0` before any division.
   **No change needed.**

3. **Cache invalidation already exists** — but in `onSettled`, not `onSuccess`. The mutations (`useCreateTransaction`, `useUpsertBudget`, `useCreateSavingsGoal`, `useUpdateSavingsGoal`, plus `useUpdateTransaction` / `useDeleteTransaction` / `useDeleteSavingsGoal`) all call `queryClient.invalidateQueries` in `onSettled`. Prefix matching means `["finance-transactions", householdId]` correctly invalidates `["finance-transactions", householdId, filters]`.

   This *should* already update the UI without a manual reload. If the user is still seeing stale data, the most likely real causes are:
   - The optimistic-update path replaces rows in cache but later invalidation is `onSettled`, which fires *after* `onSuccess`. Dialogs may close before invalidation lands, but data should still appear. Adding a **second** invalidation in `onSuccess` makes the refresh feel instant on the page that triggered the mutation.
   - The actual key names the user listed (`['finance-summary']`, `['budgets']`, `['savings-goals']`) **do not match** the keys used in this codebase (`finance-monthly-summary`, `finance-budgets`, `finance-savings-goals`). If we use the names as written, nothing would invalidate. Plan uses the **actual** keys.

## Changes

Only one file is touched: `src/hooks/useFinance.ts`.

### Add `onSuccess` invalidation (in addition to existing `onSettled`)

For each of the four mutations the user named, add a `queryClient.invalidateQueries` call in `onSuccess` for every relevant key. Keep all existing `onMutate` / `onError` / `onSettled` logic intact.

**`useCreateTransaction`** — extend the existing `onSuccess` (currently only swaps the optimistic row) to also invalidate:
- `["finance-transactions", householdId]`
- `["finance-monthly-summary", householdId]`
- `["finance-snapshot", householdId]`
- `["finance-dashboard", householdId]`
- `["finance-annual-budget", householdId]`
- `["finance-budgets", householdId]`

**`useUpsertBudget`** — extend the existing `onSuccess` to also invalidate:
- `["finance-budgets", householdId]`
- `["finance-annual-budget", householdId]`
- `["finance-dashboard", householdId]`

**`useCreateSavingsGoal`** — extend the existing `onSuccess` to also invalidate:
- `["finance-savings-goals", householdId]`
- `["finance-dashboard", householdId]`

**`useUpdateSavingsGoal`** — add an `onSuccess` (currently absent) that invalidates:
- `["finance-savings-goals"]`
- `["finance-dashboard"]`

This is a belt-and-suspenders approach: `onSuccess` runs immediately after the network call resolves (refetch starts right away), while the existing `onSettled` remains as a safety net.

### Items intentionally NOT changed

- Mutation/query logic, optimistic updates, query key shapes, and DB calls — untouched.
- `BudgetDialog`, `FinanceBudget.tsx`, `FinanceBudgetAnnual.tsx` — already handle zero/null planned amounts correctly.
- `Finance.tsx` AI Advisor card — already points at `/finance/chat`.

## Verification

1. Build cleanly (TypeScript).
2. As `testuser@dealcompass.test`:
   - Add a transaction in `/finance/transactions` → row appears without reload.
   - Save a budget in `/finance/budget` → row updates without reload.
   - Create / update a savings goal in `/finance/savings` → list updates without reload.
   - Click the "AI Advisor" card on the Finance hub → lands on `/finance/chat` (not a 404).
   - On `/finance/budget`, a row with `planned_amount = 0` shows "No budget set" with no progress bar.
