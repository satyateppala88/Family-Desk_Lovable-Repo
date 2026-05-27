# Finance — Savings & Trends enhancements

Four related changes across two pages and one hook.

## 1. Trends — stop treating Savings as Expense

**File:** `src/hooks/useFinanceTrends.ts`

Root cause of issues 1 & 2: the aggregator does `if income else expense`, so every `type='savings'` transaction silently lands in the `expenses` bucket and its sub-category (sip, mutual_fund, ppf, …) is mixed into `byCategory`.

Changes to `MonthlyAggregate` and the loop:
- Add `contributions: number` (sum of `type='savings'` rows) and `bySavingsCategory: Record<string, number>` to the bucket.
- Branch on all three types: `income` → income, `expense` → expenses + byCategory, `savings` → contributions + bySavingsCategory. Savings no longer pollute expenses or expense-category totals.
- `savingsRate` keeps using `(income − expenses) / income` — now mathematically correct because expenses no longer double-count savings outflow.

## 2. Trends — surface Savings in the charts

**File:** `src/pages/FinanceTrends.tsx`

- "Income vs Expenses" card: rename to **"Income, Expenses & Savings"**, add a third `<Bar dataKey="contributions" name="Savings" fill="hsl(var(--primary))" />`. Existing income (success green) + expenses (finance) bars unchanged.
- New card **"Savings by category"** (only renders when any month has `bySavingsCategory` data): stacked bar chart over the 6-month window, legend uses `SAVINGS_CATEGORY_LABELS` from `src/hooks/finance/types.ts`. Reuses the same palette + tooltip style as the existing top-categories chart.
- "Top categories" chart stays as-is — it now reads cleanly because savings keys (sip / mutual_fund / etc.) are no longer in `byCategory`.

## 3. Savings page — Category Dashboard with filters

**File:** `src/pages/FinanceSavings.tsx` (+ small new component `src/components/finance/SavingsCategoryDashboard.tsx` to keep `FinanceSavings.tsx` manageable)

Insert a new section directly after the existing "Total saved across all goals" tile and before the goal cards list.

Section title: **"Savings by category"**

Controls (chip row, mobile-friendly):
- Month filter: "All time" · "This month" · "Last 3 months" · "Last 12 months" (default: All time).
- Member filter: "Everyone" + one chip per household member (default: Everyone).

Body (driven by `useSavingsContributions`, filtered by selected month range and `paid_by`):
- **Donut/pie chart** (recharts `PieChart` + `Pie` with `innerRadius`) of contributions grouped by `category`, using `SAVINGS_CATEGORY_LABELS` for legend names. Center label shows filtered total (respects `PrivateValue`).
- **Category list** below the donut: each row = colored dot + label + amount (`PrivateValue`) + thin % bar + % text. Sorted desc.
- **Member split strip** (only when "Everyone" is selected and ≥2 members contributed): horizontal stacked bar with avatar initials, mirroring the existing per-goal member breakdown style.
- Empty state when filters yield zero rows: small inline message "No savings recorded for this filter."

The existing "Total saved across all goals" tile stays (it answers a different question — progress vs goal targets). The new dashboard answers "where is my money going across categories?".

## 4. Visual polish

- Donut palette: cycle through `--primary`, `--module-finance`, `--success`, `--warning`, `--accent` at 60–100% alpha so the chart reads at glance without introducing new tokens.
- All charts use the existing `recharts` setup, `formatINRCompact` for axis, `PrivateValue`-aware tooltips (mirror `moneyTip` in Trends).
- No DB / RLS changes — `finance_transactions` already carries `type='savings'`, `category`, `paid_by`, `transaction_date`.

## Technical notes

- `MonthlyAggregate` shape change is additive — `useMonthlyReport.ts` and other consumers continue to work; only `FinanceTrends.tsx` reads the new fields.
- Filter state is local React state in the new dashboard component; no URL/query persistence needed for v1.
- Recharts `PieChart` is already in the bundle (used elsewhere in finance), so no new deps.

## Out of scope

- No changes to savings goal logic, `useSavingsContributions`, RLS, or transaction creation.
- No changes to the Monthly Report or Budget pages.
