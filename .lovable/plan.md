# Savings page polish

Two focused changes to each goal card on `/finance/savings` (`src/pages/FinanceSavings.tsx`). No schema or hook changes.

## 1. Time left in the largest sensible unit

Today: `7501 days left`, `927 days left`, etc.

New rule (based on `daysLeft` already computed for each goal):
- `>= 365 days` → years, 1 decimal, e.g. `20.5 years left`
- `>= 30 days` (and < 365) → months, 1 decimal, e.g. `9.3 months left`
- `1–29 days` → `12 days left`
- `0` → `Due today`
- `< 0` → `Overdue`

Pluralization handled (`1.0 year left` vs `2.4 years left`). Decimals trimmed when the value is a whole number (`2 years left`, not `2.0 years left`).

Implementation: a small `formatTimeLeft(daysLeft)` helper next to the component (or in `src/lib/`), called where line 273 currently renders `${daysLeft} days left`. Target date string (`· 01/12/2046`) stays unchanged.

## 2. Replace the “Recent contributions” ledger with a consistency strip

Today (lines 352–368): every savings transaction for the goal is listed indefinitely — fine for 2 months, noisy after 12.

New block (only when the goal has a `target_date` so we know a horizon):

- Header: `Consistency` with a right-aligned `X / Y months` summary, where Y is the number of months from goal creation up to the current month (capped at 12 visible columns; older months scroll off).
- A horizontal row of small month chips, oldest → newest, each labelled with the month initial (`J F M A …`) and tinted:
  - filled primary green when that month had ≥ 1 savings contribution toward this goal
  - muted/empty when it did not
  - current month gets a subtle ring so the user sees “this month still open”
- Below the chips, a single line: `Contributed in N of the last M months` plus, if a streak exists, `· N-month streak`.

This communicates the same intent (“am I being regular?”) without growing unbounded.

### Data source

`goalContribs` is already available per goal (filtered savings transactions). The strip is derived client-side:

```text
months = [goal.created_at month … current month]   // capped to last 12
hit(month) = goalContribs.some(c => sameMonth(c.transaction_date, month))
streak     = trailing count of consecutive hit months ending at current month
```

No new queries; goes through the same `useSavingsContributions` data.

### Edge cases

- Goal with no contributions yet → strip shows all empty chips, line reads `No contributions yet`. The `Add` input below is the obvious next step (unchanged).
- Goal without a `target_date` → fall back to the existing single-line empty state; no strip.
- Goals created less than a month ago → show just the current-month chip.

## Out of scope

- Member breakdown block (lines 329–350) stays as-is.
- Hook signatures, RLS, and `finance_transactions` schema unchanged.
- No changes to the Add flow, signals (on track / behind), or progress bar.

## Files touched

- `src/pages/FinanceSavings.tsx` — swap the days-left string, swap the recent-contributions block for the consistency strip.
- Optional: `src/lib/formatTimeLeft.ts` for the helper (so it can be reused later on Tasks/Projects deadlines).
