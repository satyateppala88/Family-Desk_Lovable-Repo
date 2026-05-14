# Finance F-12 / F-13 / F-14 — Implementation Plan

## Important deviations from the brief (please confirm)

A few details in the prompts don't match the actual codebase. I'll proceed with the corrections below unless you tell me otherwise:

1. **Transaction type values are `income` | `expense`** in code (not `credit` | `debit`). I'll add `savings` as a third value, but UI labels will keep the existing **Debit / Credit** wording (just add a **Savings** toggle).
2. **Savings goals table is `finance_savings_goals`** (not `savings_goals`). FK will reference that table.
3. **`type` is a plain text column**, not an enum, so the `ALTER TYPE` block is a no-op — I'll drop it.
4. **`finance_savings_goals` has no `category` column**, so the "fallback: match by goal category" rule for unlinked savings can't work. I'll match unlinked savings transactions strictly by `savings_goal_id`. Alternative: I can add a `category` column to goals if you want the fallback — say the word.

---

## F-12 — `paid_by` on transactions

### DB migration
- Add `paid_by uuid` to `finance_transactions` (nullable, FK to `auth.users(id)` ON DELETE SET NULL).
- Backfill `paid_by = created_by` where null.
- Add index on `(household_id, paid_by)`.

### Form (`TransactionDialog.tsx`)
- Add a **Paid by** select below Category, above Description (Notes lives at the very bottom).
- Options come from `useHouseholdMembers(householdId)` — show avatar initials + display name.
- Default = current `auth.uid()`.
- Required. Save as `paid_by`.

### Type & hook updates (`useFinance.ts`)
- Add `paid_by: string` to `FinanceTransaction`.
- Pass through `paid_by` in `useCreateTransaction` / `useUpdateTransaction`.

### Transactions list (`FinanceTransactions.tsx`)
- Add **Paid by** filter (All members + each member) using same member list.
- On each row, render a small initials chip when `paid_by !== currentUserId`.
- Add a tab strip at top: **All transactions** | **By Member** (only render the second tab if `members.length >= 2`).
- **By Member** tab: one card per member showing this month's totals — Income (sum of `income` where `paid_by = m`), Spent (sum of `expense`), Saved (sum of `savings`). Click card → switches back to list view with that member preselected in the filter.

---

## F-13 — Savings transaction type + goal linkage

### DB migration
- Add `savings_goal_id uuid` to `finance_transactions` (nullable, FK to `finance_savings_goals(id)` ON DELETE SET NULL).
- No enum change needed (`type` is text).

### Form (`TransactionDialog.tsx`)
- Replace 2-up toggle with 3-up: **Debit / Credit / Savings**.
- When **Savings** is selected:
  - Amount label → "Amount Saved".
  - Category select swaps its option list to: SIP, Mutual Fund, Fixed Deposit, Stocks, Bank Deposit, Other.
  - Show **Link to Goal** select fed by `useFinanceSavingsGoals(householdId)` filtered to `status = 'active'`. Each option shows `name — ₹current of ₹target`. Optional. Empty state: "No goals yet — create one in Savings" linking to `/finance/savings`.
- Save `savings_goal_id` (nullable). When type switches away from savings, reset `savings_goal_id` to null.

### Constants & types
- Add `SAVINGS_CATEGORIES` constant + labels in `useFinance.ts`.
- Update `FinanceTransaction.type` to `"income" | "expense" | "savings"`.
- Update `useFinanceSummary` so `savings`-typed transactions are excluded from `expenses` and reported as a new `savedThisMonth` total.

### `FinanceSavings.tsx` updates
- For each goal card, compute **actual contributions** = sum of `finance_transactions` where `savings_goal_id = goal.id`. Show `₹X saved | ₹Y goal | Z% complete` and drive the progress bar from this value (still allow manual `current_amount` for legacy goals — display the larger of the two).
- Add an expandable **Contributions** section listing the latest 5 linked transactions (Date · Description · Category · Amount · Paid by). "View all" expands to full list.
- Add a **Savings Timeline** section below the goals list:
  - Period toggle: Week / Month / Quarter / Year (last 6 / 6 / 4 / 3 buckets).
  - Recharts grouped bars: Target (`#E8E4D9`) vs Actual (`#0F6E56`).
  - Target = sum of (goal target − current) prorated across remaining periods until `target_date`; Actual = sum of `savings` transactions in the bucket.
  - ✓ badge above any bar where actual ≥ target.

### New hook
- `useSavingsContributions(householdId, { goalId?, period? })` to power the goal cards and timeline chart.

---

## F-14 — Finance hub member summary

### `MemberContributions.tsx`
- Extend `useMemberContributions` to return `{ income, spent, saved }` per member for the selected month (currently returns `{ total }` from income only).
- Render each member row as: avatar + name on top, then `Income ₹X · Spent ₹Y · Saved ₹Z`. Show `—` when a value is 0.
- Keep the "single-member households: hide entirely" guard.
- Section title stays roughly the same; can rename to "Member summary this month".

---

## Files to touch

- `supabase/migrations/<new>.sql` — F-12 + F-13 schema
- `src/hooks/useFinance.ts` — types, summary, mutations, savings categories
- `src/hooks/useMemberContributions.ts` — return income/spent/saved
- `src/hooks/useHouseholdMembers.ts` — reuse as-is
- `src/hooks/useSavingsContributions.ts` — new
- `src/components/finance/TransactionDialog.tsx` — paid_by, 3-way toggle, goal link
- `src/components/finance/MemberContributions.tsx` — new layout
- `src/pages/FinanceTransactions.tsx` — paid_by filter + chip + tabs + by-member cards
- `src/pages/FinanceSavings.tsx` — actuals, contributions list, timeline chart
- `src/pages/Finance.tsx` — picks up updated `MemberContributions` automatically (no layout change)

No edge-function changes. RLS on new columns is covered by existing household-scoped policies on `finance_transactions`.
