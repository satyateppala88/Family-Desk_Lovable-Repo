## Problem

Two related bugs in **Finance → Add Transaction**:

1. **Salary (and other income) saves as an expense.** The dialog defaults Type = "Expense". When a user picks the "Salary" category but doesn't notice the Expense/Income toggle, the transaction is saved as `type: "expense"` with category `"salary"`. It then shows with a `−` sign and red styling.
2. **"All Categories" view appears to be missing the transaction.** It isn't actually missing — the query correctly returns all categories when the filter is `"all"` (verified in `useFinance.ts` line 164). But because the salary entry is saved as an expense, the user sees a `−₹X` row that doesn't look like their salary, so it feels missing. Filtering by category = "Salary" still shows it (same row, still mislabeled as expense).

The underlying cause for both is the same: **category and transaction type aren't linked, and the labels "Expense/Income" are easy to overlook.**

## Fix

### 1. Rename the toggle to "Debit / Credit" and make it more prominent

In `src/components/finance/TransactionDialog.tsx`:
- Replace the two `Expense` / `Income` buttons with clearer **Debit (money out)** and **Credit (money in)** buttons.
- Keep the underlying values as `"expense"` (debit) and `"income"` (credit) so no DB schema change is needed.
- Add a one-line helper text under the toggle: *"Debit = money leaving your account · Credit = money coming in"*.
- Style the selected state more strongly (color the active button red for Debit, green for Credit) so it's visually obvious which one is selected.

### 2. Auto-suggest the correct type when an income category is picked

When the user picks a category that is inherently income (`salary`, `freelance`, `investment`), automatically flip the type to **Credit** (and vice versa for clearly-expense categories the first time). The user can still override.

Income categories: `salary`, `freelance`, `investment`.

Implementation: in the `Select onValueChange` for category, if the new category is in the income set and the user hasn't manually toggled type, set type to `"income"`. Track a `userTouchedType` flag so we never override an explicit choice.

### 3. Update transaction list labels

In `src/pages/FinanceTransactions.tsx`:
- Change the Type filter dropdown labels from "Income / Expense" to **"Credit / Debit"** for consistency. Underlying values stay `income` / `expense`.
- Keep the existing `+` / `−` icons and green/neutral coloring (already correct for income vs expense).

### 4. No database / schema changes

The `finance_transactions.type` column already stores `'income' | 'expense'`. Amounts are stored as positive numbers; the sign is derived from `type` at render time (already done correctly on line 126 of `FinanceTransactions.tsx`). So no migration needed.

## Files changed

- `src/components/finance/TransactionDialog.tsx` — rename toggle to Debit/Credit, add helper text, auto-suggest type from category, stronger active styling.
- `src/pages/FinanceTransactions.tsx` — relabel Type filter options to "Credit / Debit".

## Impact on other features

- **FinanceMonthlySummary, dashboard, budgets, monthly review, AI finance chat** — all read `type === "income"` vs `"expense"`. Unchanged values, so zero impact.
- **Card recommender** — only fires when `type === "expense"` (line 65 of TransactionDialog). Still works; renaming the button doesn't change the value.
- **Existing transactions** — any salary already saved as "expense" will stay that way. The user can edit it via the pencil icon and switch it to Credit. (Optional follow-up: I can run a one-time data fix to flip all `category in (salary, freelance, investment) AND type = expense` rows to `type = income` — let me know if you want that.)

## Out of scope

- Allowing negative amounts directly (we keep amounts positive + a type flag — cleaner and matches the existing schema).
- Adding new income categories.
