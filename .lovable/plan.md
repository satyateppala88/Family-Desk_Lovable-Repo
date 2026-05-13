## Findings

All three issues touch only `src/hooks/useFinance.ts`, `src/pages/FinanceBudget.tsx`, and (for #3) the Finance hub link. Mutation logic and DB queries stay untouched.

### Problem 1 — UI doesn't refresh after Finance mutations

`useFinance.ts` mutations rely heavily on optimistic cache writes but don't invalidate sibling queries that derive from the same data. Net result: the row that was mutated does appear in lists where the optimistic write landed, but derived views (monthly summary, dashboard, snapshot, annual budget, category breakdown used by the Budget page) drift stale until a manual reload.

Specifics:
- `useCreateTransaction` — only invalidates `finance-monthly-summary` + `finance-dashboard` in `onSettled`. Misses `finance-snapshot`, `finance-annual-budget`, `finance-budgets` (budget progress reads transactions), and doesn't safety-net `finance-transactions` itself.
- `useUpdateTransaction` / `useDeleteTransaction` — only invalidate `finance-monthly-summary` (no `householdId` scope) and don't touch dashboard / snapshot / annual / budgets.
- `useUpsertBudget` — no invalidation at all on success/settled. Annual budget rollup (`finance-annual-budget`) and dashboard never refresh.
- `useCreateSavingsGoal` / `useUpdateSavingsGoal` / `useDeleteSavingsGoal` — no invalidation; goal milestone widgets on the dashboard go stale.

**Fix:** add an `onSettled` (or extend the existing one) on each mutation that calls `queryClient.invalidateQueries({ queryKey: [<key>, householdId] })` for every prefix that consumes the same underlying data. We use `onSettled` (not `onSuccess`) so the cache also self-heals after an optimistic rollback.

Per mutation, invalidate:

| Mutation | Keys to invalidate (prefixed with `householdId` where used) |
|---|---|
| `useCreateTransaction` | `finance-transactions`, `finance-monthly-summary`, `finance-snapshot`, `finance-dashboard`, `finance-annual-budget`, `finance-budgets` |
| `useUpdateTransaction` | same as above |
| `useDeleteTransaction` | same as above |
| `useUpsertBudget` | `finance-budgets`, `finance-annual-budget`, `finance-dashboard` |
| `useCreateSavingsGoal` | `finance-savings-goals`, `finance-dashboard` |
| `useUpdateSavingsGoal` | same |
| `useDeleteSavingsGoal` | same |

`useUpdateTransaction` / `useDeleteTransaction` currently lack a `householdId` parameter — they invalidate the unscoped prefix (`["finance-transactions"]`), which already matches every household-scoped variant via React Query prefix matching, so they don't need a signature change. New invalidations will follow the same prefix-only pattern for those two hooks.

### Problem 2 — Budget progress bar shows broken state when planned = 0

In `src/pages/FinanceBudget.tsx`:
- Lines 84/88 already guard divide-by-zero numerically (`pct = 0` when `planned_amount <= 0`), but the `<Progress value={overallPct} />` (line 138) and `<Progress value={row.pct} />` (line 173) always render — they show as an empty/incorrect bar with a "0% used" label and a percentage chip.

**Fix:** when the relevant `planned_amount` (or `totalPlanned`) is `<= 0` or null:
- Hide the `<Progress>` element entirely.
- Hide the percentage chip / "X% used" footer for that row.
- Replace with a small muted `"No budget set"` hint so the row still has visual weight.

This applies in two places in `FinanceBudget.tsx`: the overall card (line 130–141) and each `budgetRows.map(...)` row (line 157–224).

### Problem 3 — AI Advisor 404

Already fixed in current code: `src/pages/Finance.tsx:72` links the AI Advisor card to `/finance/chat`, and `App.tsx:213` registers `<Route path="/finance/chat" …>` to `FinanceChat`. There is **no remaining reference** to `/finance/ai-advisor` anywhere in `src/`. No code change required — I'll call this out in the change summary so the user knows it was already correct.

## Files to change

1. **`src/hooks/useFinance.ts`** — add the `invalidateQueries` calls listed above, inside each mutation's `onSettled` (creating one where missing). Keep all optimistic-update logic untouched.
2. **`src/pages/FinanceBudget.tsx`** — wrap both `<Progress>` instances + their adjacent percentage labels in a `planned > 0` conditional; render a `"No budget set"` muted hint otherwise.

## Verification

- Manual against the test account on the Test environment:
  1. Add a transaction → confirm the transaction list, the "spent" totals on Budget, the monthly summary chips on Finance hub, and FinanceTrends all reflect the new row without reload.
  2. Save a budget for a category → confirm Annual rollup updates and the row's bar appears on Monthly without reload.
  3. Create a savings goal → confirm it appears on Savings page without reload.
  4. Open Budget on a household with a category budget set to 0 → confirm no progress bar renders and "No budget set" hint shows; setting it above 0 brings the bar back.
  5. Click AI Advisor on the Finance hub → confirm `/finance/chat` opens (already wired correctly).
- Run `bunx vitest run` to make sure no Finance-related tests regress.