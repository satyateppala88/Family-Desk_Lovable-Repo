# Finance fixes (3 issues)

## 1. Month should reset to current when re-entering Finance

**Problem:** `useSelectedMonth` persists the chosen month in `localStorage`, so after navigating away from `/finance/*` and back, the user lands on the old month.

**Fix:** Remove `localStorage` persistence from `src/hooks/useSelectedMonth.ts`. Keep the URL `?m=YYYY-MM` as the only override. This way:
- Within a finance session, the chosen month follows you across `/finance/transactions`, `/finance/budget`, etc. via the URL.
- Leaving the module and re-entering `/finance` (no `?m=`) falls back to the current month automatically.
- Strip the `STORAGE_KEY`, `readStored`, `writeStored`, the storage-event listener, and the `CHANGE_EVENT` re-render bump (no longer needed since URL changes already trigger re-renders via `useSearchParams`).

## 2. "Saved" card should use savings transactions, plus add a "Balance left" card

**Problem:** In `FinanceMonthlyReview.tsx`, the Saved card shows `(income − expenses) / income %`, which conflates leftover cash with actual money moved to savings goals.

**Fix:**
- In `src/hooks/finance/useFinanceSummary.ts`, `summary.saved` already correctly sums transactions where `type === 'savings'`. Keep it.
- In `src/pages/FinanceMonthlyReview.tsx`:
  - Change the summary grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4`.
  - Replace the existing 3 cards with **Earned**, **Spent**, **Saved**, **Balance left**:
    - Earned = `summary.income`
    - Spent = `summary.expenses`
    - Saved = `summary.saved` (₹ amount, not a %)
    - Balance left = `summary.income − summary.expenses − summary.saved`
  - Keep `savingsRate` as the existing `(income − expenses) / income` only where used in "What went well" / tip copy (those are health-check messages about leftover cash, which is reasonable). Optionally we can switch those to `saved/income` later — not in scope unless requested.

## 3. Transactions ordered by created_at desc

**Problem:** `useFinanceTransactions` orders by `transaction_date` only. Two transactions added today land in insertion order rather than newest-first.

**Fix:** In `src/hooks/finance/useFinanceTransactions.ts`, change the order chain to:
```ts
.order("transaction_date", { ascending: false })
.order("created_at", { ascending: false })
```
This keeps the date-based grouping users expect, while ensuring newer entries on the same date appear first.

## Files touched

- `src/hooks/useSelectedMonth.ts` — drop localStorage persistence
- `src/hooks/finance/useFinanceSummary.ts` — no change needed (already returns `saved`)
- `src/pages/FinanceMonthlyReview.tsx` — 4-card summary including Balance left
- `src/hooks/finance/useFinanceTransactions.ts` — add secondary `created_at desc` sort

## Out of scope (you mentioned "more issues" but didn't list them)

Happy to take the rest in the next message — list them whenever ready.