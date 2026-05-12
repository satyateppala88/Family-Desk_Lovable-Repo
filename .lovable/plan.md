# Month-wise Finance Tracking (Axio-style)

## What you'll get

Today the Finance module always shows "this month". Once a month rolls over, last month's view is gone unless you eyeball Transactions. This adds first-class month navigation and historical comparisons — similar to how Axio/Walnut let you swipe between months and see trends.

### New capabilities

1. **Global month switcher** — A `← July 2026 →` control at the top of Finance hub, Transactions, Budget, and Monthly Review. Selected month persists across these pages (URL `?m=2026-07`) so you can drill into a past month seamlessly.
2. **Month-over-month chips** on Finance hub — Income, Spent, Saved show "▲ 12% vs Jun" deltas.
3. **Trends page** (new `/finance/trends`) — Axio's signature view:
   - 6-month bar chart: Income vs Expenses
   - 6-month line: Savings rate %
   - Top 5 categories trend (stacked bars)
   - "Biggest movers" list — categories that grew/shrank most vs last month
4. **Daily spending pattern** card on Monthly Review — small bar chart of spend per day in the selected month, with weekend highlights.
5. **Past month transactions** — Transactions page filters by selected month by default (with "All time" toggle), so historical browsing is one click away.
6. **Hub tile addition** — replace nothing; add a "Trends" tile in the Finance hub grid pointing to `/finance/trends`.

### Out of scope (can be follow-ups)

- Year-end report / annual review
- Forecasting next month's spend
- Exporting a month as PDF/CSV (already partially possible via Review)
- Per-member month-wise split

---

## Technical Details

**Data layer** — no schema change needed. `useFinanceTransactions`, `useFinanceBudgets`, `useFinanceMonthlySummary`, `useFinanceMonthlySnapshot` already accept a `month` parameter. We just thread a selected-month value through the UI.

**New shared hook** — `useSelectedMonth()` reads/writes `?m=YYYY-MM` from the URL with `useSearchParams`, defaulting to current IST month. Used by all Finance pages.

**New components**
- `src/components/finance/MonthSwitcher.tsx` — `← Month YYYY →` with prev/next/jump-to-current; disables "next" when at current month.
- `src/components/finance/TrendsChart.tsx` — wraps `recharts` (already in project) for the 6-month bar/line.
- `src/components/finance/DailySpendChart.tsx` — small daily bar chart for Monthly Review.

**New hook** — `useFinanceTrends(householdId, monthsBack=6)` — runs one query for the last N months of transactions, aggregates client-side into `{ month, income, expenses, byCategory }[]`. Cached 5 min.

**New page** — `src/pages/FinanceTrends.tsx` registered in `src/App.tsx` under `/finance/trends`, wrapped in `ModuleSetupGate("finance_setup")`.

**Edits**
- `src/pages/Finance.tsx` — add MonthSwitcher, MoM delta chips on summary cards, "Trends" tile in module grid.
- `src/pages/FinanceTransactions.tsx` — read `?m`, pass to `useFinanceTransactions`, add MonthSwitcher + "All time" toggle.
- `src/pages/FinanceBudget.tsx` — read `?m`, pass to budgets/summary so you can plan/review past or future months.
- `src/pages/FinanceMonthlyReview.tsx` — read `?m`, replace hardcoded `currentMonth`, add DailySpendChart card.

**Routing** — add `/finance/trends` to the router; no nav-component changes (uses existing FinanceNav if present, otherwise the hub tile).

**Performance** — Trends hook does one bounded query (`transaction_date >= 6 months ago`) and aggregates in memory; well under the 1000-row Supabase limit for typical households. If a household exceeds that, fall back to running monthly summary queries in parallel for each of the 6 months.

**Realtime** — existing `useFinanceRealtime` already invalidates summary/transaction caches; trends will piggy-back via the same invalidation key pattern.

---

## Files touched

- new: `src/hooks/useSelectedMonth.ts`
- new: `src/hooks/useFinanceTrends.ts`
- new: `src/components/finance/MonthSwitcher.tsx`
- new: `src/components/finance/TrendsChart.tsx`
- new: `src/components/finance/DailySpendChart.tsx`
- new: `src/pages/FinanceTrends.tsx`
- edit: `src/App.tsx` (add route)
- edit: `src/pages/Finance.tsx`
- edit: `src/pages/FinanceTransactions.tsx`
- edit: `src/pages/FinanceBudget.tsx`
- edit: `src/pages/FinanceMonthlyReview.tsx`

No DB migration. No backend changes. ~1 medium build.
