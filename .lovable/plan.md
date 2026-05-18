# F-24 — Budget Rollforward & Annual Split

## Schema reality vs prompt
The table is `public.finance_budgets`, not `budgets`, and it stores the period as a single text column `month` (format `"YYYY-MM"`), not `period_month` + `period_year`. The prompt's SQL is generic — the migration must target the real table/columns. The unique key in code today is `(household_id, month, category)`.

Existing pieces to respect (per F-15 / F-22):
- `useCarryForwardBudgets` already clones the previous month's budgets into the current month on first visit. With true recurring budgets, this auto-clone becomes redundant and would double-write. We'll **gate the auto-clone so it skips any category already covered by a recurring budget**, and stop cloning categories whose source row is itself `is_recurring=true` (recurring rows never need a physical clone).
- Member pills, breakdown, edit dialog, duplicate prevention list — untouched except where the prompt explicitly extends them.

## Part 1 — Migration

Add three columns to `public.finance_budgets`:
- `is_recurring boolean NOT NULL DEFAULT false`
- `budget_type text NOT NULL DEFAULT 'monthly'` + CHECK (`monthly` | `annual`)
- `annual_amount numeric NULL`

Index for the lookup in Part 3:
- `CREATE INDEX IF NOT EXISTS idx_finance_budgets_recurring ON public.finance_budgets (household_id, category, month) WHERE is_recurring = true;`

No backfill (Part 6: existing rows stay `is_recurring=false`).

## Part 2 — `BudgetDialog`: inline rollforward question + Monthly/Annual toggle

`src/components/finance/BudgetDialog.tsx`:
1. Add `budgetType: "monthly" | "annual"` state. Render chip toggle `[Monthly] [Annual]` above the amount field. Default monthly. Disabled in edit mode if the existing record's type would change (lock to current type).
2. **Monthly + create**: after amount entered, show inline section with two radios:
   - `Yes — repeat every month from {monthLabel}` (default)
   - `No — only apply to {monthLabel}`
3. Submit label is dynamic:
   - Monthly + Yes → `"Save & Apply to Future Months"`
   - Monthly + No → `"Save for {monthLabel} Only"`
   - Annual → `"Save Annual Budget"`
4. **Annual**: amount label becomes `"Annual Budget Amount (₹)"`; show live preview `"= ₹{floor(amount/12)} per month"`. Hide the recurring radio entirely.
5. `onSave` signature extended to `{ category, planned_amount, is_recurring, budget_type, annual_amount? }`.
6. Edit flow for a *recurring* row gets a disambiguation step BEFORE the amount field (see Part 3) — implemented by passing a new prop `scopeChoice: "this_month" | "all_future" | null` controlled by the page.

`src/pages/FinanceBudget.tsx` consumer wiring:
- For "Monthly + Yes": call upsert with `is_recurring=true, budget_type='monthly'`, `month = currentMonth` (the recurring anchor).
- For "Monthly + No": `is_recurring=false`.
- For "Annual": store `month = "${year}-01"`, `budget_type='annual'`, `annual_amount=N`, `planned_amount=floor(N/12)`, `is_recurring=true`. Year = year of the currently-viewed month.
- When `MonthSwitcher` would be shown for an annual creation context: it stays — annual entry is initiated from the existing Add flow; the period selector is hidden *inside the dialog only* (we don't have a month selector inside the dialog today, so nothing to hide there).

## Part 3 — Rollforward resolution in `useFinanceBudgets`

`src/hooks/useFinance.ts` → rewrite `useFinanceBudgets(householdId, month)`:
1. Fetch all rows for the household where `month <= currentMonth` AND (`month = currentMonth` OR `is_recurring = true`).
2. Resolve per-category client-side:
   - If a row with exact `month = currentMonth` exists → use it (override / period-specific). Mark `_source = "exact"`.
   - Else pick the most recent `is_recurring=true` row with `month <= currentMonth` and `budget_type='monthly'` → use it but **substitute** `month = currentMonth` in the returned object and set `_source = "recurring"`, keep `_originalId`, `_originalMonth`.
   - For `budget_type='annual'` recurring rows: only surface if `month`'s year ≤ currentMonth's year and the row's year matches currentMonth's year (`row.month.slice(0,4) === currentMonth.slice(0,4)`). Mark `_source = "annual"`, expose `annual_amount`.
3. Return the resolved array typed as `FinanceBudget & { _source: 'exact'|'recurring'|'annual'; _originalId?: string; _originalMonth?: string; annual_amount?: number | null }`.
4. **No DB writes** in this function — purely resolved in the query callback.

`FinanceBudget` interface gets the new optional fields (`is_recurring`, `budget_type`, `annual_amount`, plus the resolution metadata).

## Part 4 — Edit a recurring/annual row from the month view

In `FinanceBudget.tsx`:
- When user opens edit on a row where `_source === "recurring"`, first show a small `ConfirmDialog`-style scope picker:
  - "This month only ({monthLabel})" → on save, insert a new `finance_budgets` row with `month = currentMonth, is_recurring=false`, leave original untouched.
  - "This and all future months" → on save, `UPDATE finance_budgets SET planned_amount = X, updated_at = now() WHERE id = _originalId`.
- When `_source === "exact"` or `"annual"`: no scope picker, edit behaves as today (annual edits update the anchor row's `annual_amount` and re-derive `planned_amount = floor(/12)`).
- New mutation helper `useUpdateRecurringBudget` in `useFinance.ts` to handle the two branches above (just an UPDATE by id, plus query invalidation).

## Part 5 — Chips + Annual tab behavior

`FinanceBudget.tsx` budget rows:
- Replace static "Budget set" chip with:
  - `_source === "recurring"` → "Budget set · Recurring"
  - `_source === "annual"` → "Budget set · Annual" with a Tooltip showing `₹{annual_amount} annual · ₹{planned_amount}/month`
  - `_source === "exact"` → "Budget set" (unchanged)

`FinanceBudgetAnnual.tsx` stays mostly the same (it's already an annual rollup), but the rollup now needs to count annual-type rows. Extend `useFinanceAnnualBudget` to include `budget_type='annual'` rows: their monthly amount is `annual_amount / 12` repeated across the 12 months of that year. Recurring monthly rows propagate forward across the year just like Part 3 does for the month view.

## Part 6 — Existing data & duplicate prevention

- No migration script. Existing rows stay `is_recurring=false`.
- F-22 duplicate prevention list (`existingCategories` prop to `BudgetDialog`) now includes any category resolved via rollforward for the current month, not just exact-match rows. Source the list from the same resolved array returned by `useFinanceBudgets`.
- Carry-forward effect in `FinanceBudget.tsx`: filter out any category that already resolves via a recurring budget so we don't double-create rows.

## Files touched
- `supabase/migrations/...` — new migration (Part 1)
- `src/hooks/useFinance.ts` — `FinanceBudget` type, `useFinanceBudgets` resolution, `useUpsertBudget` accepts new fields, new `useUpdateRecurringBudget`, extend `useFinanceAnnualBudget` aggregator, tweak `useCarryForwardBudgets` to skip recurring-covered categories.
- `src/components/finance/BudgetDialog.tsx` — Monthly/Annual toggle, inline recurring radio, dynamic button label, annual preview.
- `src/pages/FinanceBudget.tsx` — wire new fields, scope picker for edit of recurring rows, chip variants, tooltip for annual, dedupe list source.
- `src/pages/FinanceBudgetAnnual.tsx` — pull through annual-type rows in the rollup (and the chip on each card).

## Order of execution
1. Run the migration (Part 1). Wait for approval, then types regenerate.
2. Hook changes (`useFinance.ts`) — types + resolver + new mutation.
3. `BudgetDialog` UI + save signature.
4. `FinanceBudget` page wiring + chips + scope picker.
5. `FinanceBudgetAnnual` rollup + chip.

## Out of scope
- No new components beyond a small inline scope picker (uses existing `ConfirmDialog` patterns).
- No changes to F-15 member pills / breakdown.
- No changes to category list, transaction logic, or RLS.
- No data backfill.
