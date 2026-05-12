## Goals (revised)

1. Make a **dedicated Categories management page** (create / **rename** / delete) accessible from the **Budget** sub-page (not the Finance hub).
2. **Auto-carry budgets forward** each month — when you open a month with no budgets yet, copy the most recent prior month's budget rows into it (one-time per month).
3. Keep the existing **per-month edit** flow — adjusting a budget for one month must not mutate any other month.
4. Add an **Annual Budget view** that rolls up monthly planned vs. actual across the calendar/financial year.

---

## 1. Categories management — under Budget

### New page `src/pages/FinanceBudgetCategories.tsx` at route `/finance/budget/categories`

Sections:
- **Built-in categories** — read-only list grouped Income / Expense, with friendly labels. Helps users not duplicate.
- **Your custom categories** — table/list of `finance_custom_categories` rows for the household:
  - Label (inline editable — pencil icon → input → save/cancel) → calls a new `useUpdateCustomCategory` hook that updates the `label` (and `updated_at`). The `key` is **never** changed, so all existing transactions, budgets, and subscriptions stay linked.
  - Scope badge (Transactions / Subscriptions / All) — also editable via small dropdown.
  - Delete button with `ConfirmDialog`. Warning: existing transactions/budgets keep their category key, but lose the friendly label and will display as the slugified key.
- **Add category** form: label + scope selector + Add button. Reuses `useAddCustomCategory`.
- Empty state with a one-line explanation.

### Entry points
- **Budget page (`src/pages/FinanceBudget.tsx`)** — small "Manage categories" link/button in the page header next to "Add", and a secondary tile under the budget list.
- **Inline `CategorySelect` dropdown** — small "Manage all categories →" link under "+ Create new category" navigating to `/finance/budget/categories`.
- **Finance hub** — no new entry (per request).

### Hook additions
- `useUpdateCustomCategory` in `src/hooks/useCustomCategories.ts` — mutates `label` and/or `scope` by id; same household guard already enforced by RLS.

No DB schema change required (label/scope are already updatable, RLS already allows household members to UPDATE).

---

## 2. Auto carry-forward of budgets

### Behaviour
When the Budget page loads a month and `useFinanceBudgets(householdId, month)` returns an empty list:
- Look up the most recent prior month that has any budget rows for this household (single query: `SELECT month FROM finance_budgets WHERE household_id = ? AND month < ? ORDER BY month DESC LIMIT 1`).
- If found, **automatically clone** those rows into the current month with the same `(category, planned_amount)`. Run as a single bulk insert.
- After cloning, the existing query refetches and renders normally.
- A small toast: "Carried forward N categories from {Mon YYYY}. Edit anytime."
- An "Undo" action on the toast (deletes the just-inserted rows for this month) for a few seconds.

### Idempotency / race safety
- Cloning only runs when `budgets.length === 0` AND we haven't tried for this `(householdId, month)` in the current session (guarded by a small in-memory `Set` ref).
- Add a unique index on `finance_budgets (household_id, month, category)` to make accidental duplicates impossible. (Schema migration.)
- The clone uses `ON CONFLICT (household_id, month, category) DO NOTHING` to be safe.

### Per-month edits
- Existing `useUpsertBudget` already keys by `(household_id, month, category)`, so editing/adding for one month never touches another. No change needed beyond the unique index.
- BudgetDialog stays as-is for adding new categories. Existing rows already render with their own progress; we'll make each row's planned amount **inline editable** (click amount → input → save) calling `useUpsertBudget` for the *currently selected month only*. This gives the "update budget for a category for a given month" affordance the user asked for.

### New-household behaviour
- First-ever month: no prior budgets exist → no clone, normal empty state with "Add" CTA. Unchanged.

---

## 3. Annual Budget rollup

### New page `src/pages/FinanceBudgetAnnual.tsx` at route `/finance/budget/annual`

- **Year switcher** at top (◀ 2026 ▶), defaults to the year of the currently selected month from `useSelectedMonth`.
- **Summary card**: total planned (sum of all `planned_amount` across 12 months) vs. total actual (sum of expense transactions in those months) with a single progress bar and % used.
- **By-category table** (one row per category that appears in any of the 12 months):
  - Annual planned (sum of monthly planned)
  - Annual actual (sum from `finance_transactions` for that category in the year)
  - Variance (₹ + %)
  - Mini 12-cell heatmap (Jan…Dec) showing pct-of-budget per month — color-coded (green ≤ 80%, amber 80–100%, red >100%, grey if no budget that month).
- **By-month table / chart** (collapsible): planned vs. actual for each month.
- Click any month cell → navigates to `/finance/budget?m=YYYY-MM` (uses existing month persistence).

### Hook
New `useFinanceAnnualBudget(householdId, year)` in `src/hooks/useFinance.ts`:
- One query: `SELECT month, category, planned_amount FROM finance_budgets WHERE household_id = ? AND month BETWEEN 'YYYY-01' AND 'YYYY-12'`.
- One query: `SELECT category, transaction_date, amount, type FROM finance_transactions WHERE household_id = ? AND type = 'expense' AND transaction_date BETWEEN 'YYYY-01-01' AND 'YYYY-12-31'`.
- Aggregate client-side into the structures above.
- `staleTime: 60_000`.

### Entry point
- Tab/segmented control at the top of `/finance/budget` with two options: **Monthly** (current page) and **Annual**. Mobile-friendly pill style consistent with `TaskmasterSubNav`.

---

## 4. Routing & navigation

- Register `/finance/budget/categories` and `/finance/budget/annual` in `src/App.tsx` (lazy, behind `ProtectedRoute`).
- `/finance/budget` keeps its current monthly view.

---

## Files to change

- **Add** `src/pages/FinanceBudgetCategories.tsx`
- **Add** `src/pages/FinanceBudgetAnnual.tsx`
- **Edit** `src/App.tsx` — two new routes
- **Edit** `src/pages/FinanceBudget.tsx` — Monthly/Annual tab, "Manage categories" entry, carry-forward effect, inline planned-amount edit
- **Edit** `src/hooks/useCustomCategories.ts` — add `useUpdateCustomCategory`
- **Edit** `src/hooks/useFinance.ts` — add `useCarryForwardBudgets` and `useFinanceAnnualBudget`
- **Edit** `src/components/finance/CategorySelect.tsx` — add "Manage all categories →" link

## Database migration

Single migration:
- `CREATE UNIQUE INDEX IF NOT EXISTS finance_budgets_household_month_category_key ON public.finance_budgets (household_id, month, category);`

(No data migration; safe additive change. Will surface — and reject — pre-existing duplicates only on insert; if duplicates already exist they remain but new conflicting inserts will be rejected. We can run a one-off check first.)

## Out of scope

- Renaming a built-in category.
- Reassigning transactions when a custom category is deleted.
- Per-category color/icon.
- Carrying forward across a year boundary differently (it just uses "most recent prior month", which works the same).