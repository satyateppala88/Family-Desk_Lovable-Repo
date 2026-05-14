## F-15 — Budget by Member View (filtered, no schema changes)

All changes in `src/pages/FinanceBudget.tsx`. Reuses `useFinanceTransactions` (already supports `paidBy`) and `useHouseholdMembers`. No new hooks, no schema changes.

**Note on type values:** the codebase stores expenses as `type='expense'` (not `'debit'`) and credits as `'income'`. The brief's `'debit'` will be implemented as `type='expense'`. Same applies to F-15's "highest spender" sum.

### Change 1 — Member filter pill row
- Add `selectedPaidBy` state (default `"household"`).
- Fetch `members` via `useHouseholdMembers`. Render the pill row only when `members.length >= 2`.
- Pills: `[Household, ...members]`. Active pill = brand green (`bg-primary text-primary-foreground`); inactive = outline + `text-ink-soft`. Horizontally scrollable (`overflow-x-auto`, `flex gap-2`, no scrollbar).
- When a member is selected:
  - Call `useFinanceTransactions(householdId, { month: currentMonth, type: "expense", paidBy: selectedUserId })` and aggregate per category client-side into `memberCategorySpend`.
  - Override the per-card `actual` value with `memberCategorySpend[category] ?? 0` while keeping `planned_amount` untouched.
  - Card subtitle becomes: `"<FirstName>'s spend · Household limit: ₹Y"` (replaces current `"₹X spent"` line).
  - Overall progress card also re-totals from member spend.
- Default `"Household"` keeps existing behaviour (uses `summary.categoryBreakdown`).

### Change 2 — Member breakdown inside each category card (Household view only)
- Only when `selectedPaidBy === "household"` and `members.length >= 2`.
- Fetch a single month-scoped `useFinanceTransactions(householdId, { month: currentMonth, type: "expense" })` and group by `(category, paid_by)` into a memoized `Map`.
- Per card, append a collapsible block:
  - Collapsed: text button `↓ See by member` (`text-[11px] text-muted-foreground`).
  - Expanded: rows sorted by spend desc, each showing avatar initials (reuse existing avatar pattern from `MemberContributions.tsx`), first name, `₹amount`, proportional bar, `%`. Percentage = member spend / total category spend (not vs limit). Bar width = same %.
  - Skip rows with ₹0.
  - Transactions where `paid_by IS NULL`: bucket under `created_by` (legacy fallback).
- Local React state `Record<budgetId, boolean>` for expanded state. No DB.

### Change 3 — Top spender callout
- Below the existing overall progress `Card`, render one line of `text-xs text-muted-foreground`.
- From the same month-scoped expense query, group by `paid_by` (NULL → `created_by`), find top member.
- Show only if `members.length >= 2` AND top member has `>= 3` transactions this month AND at least 2 distinct payers exist.
- Format: `"Highest spender this month: <FirstName> — ₹X across all categories"`.

No edits to budget creation, limits, categories, or layout.

---

## F-16 — Savings Goal Intelligence: On-Track Signal

All changes in `src/pages/FinanceSavings.tsx` and `src/components/finance/SavingsGoalDialog.tsx`. No schema changes. All math client-side from existing `useSavingsContributions` data.

### Change 1 — Per-goal rate computation
- In the goal map, compute `monthsActive`, `totalSaved` (= `linkedSum` already computed), `monthlyRate`, `remaining`, `monthsToGoal` per the brief's formulas. Skip if `linkedSum` should equal `totalSaved` exactly per spec — use the linked-only sum, not `effectiveAmount`, to avoid manual `current_amount` polluting the rate.

### Change 2 — Signal chip rendering
Add a small chip next to the goal name (or directly below) using existing colour tokens:
- Green chip → `bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]`.
- Amber chip → `bg-warning/10 text-warning`.
- Red chip → `bg-destructive/10 text-destructive`.

Logic exactly per brief:
- **Case A (target_date set):**
  - `totalSaved >= target_amount` → green `"Goal reached 🎉"`, full green progress, no other signal.
  - `monthsToGoal <= monthsRemaining` → green `"On track · Expected by Mon YYYY"` (date = today + monthsToGoal months via `date-fns addMonths` + `format(d, "MMM yyyy")`).
  - `monthsToGoal <= monthsRemaining * 1.5` → amber `"Slightly behind · Consider reviewing contributions"`.
  - else (incl. `monthlyRate === 0`) → red `"You might want to review this goal"`.
  - For amber/red: small grey line `"Needed to stay on track: ₹<shortfall> more/month"` where `shortfall = ceil((remaining/monthsRemaining) - monthlyRate)`. Hide if `shortfall <= 0`.
- **Case B (no target_date):** below progress bar, render tappable link `"Set a target date to see if you're on track →"` that opens an edit dialog with the date field auto-focused. No projection, no rate text.
- **Case C (`differenceInDays(now, created_at) < 30` AND `linkedTxnCount < 2`):** render nothing extra.

### Change 3 — Off-track nudge banner
- Compute `redGoals = goals.filter(redChip)`. If `redGoals.length >= 1` AND not previously dismissed, render a single `Card` at top of page:
  - Text: `"A few goals could use some attention."`
  - `[Review]` button → `document.getElementById('goal-' + redGoals[0].id)?.scrollIntoView({behavior:'smooth'})`. Add `id="goal-{goal.id}"` on each goal `Card`.
  - `[X]` button → set `sessionStorage.setItem('savings-nudge-dismissed','1')` and hide.
- Hidden if all on-track/completed/no-signal or session-dismissed.

### Change 4 — Per-member contribution breakdown inside goal card
- The current "Recent contributions" section already lists last 5. Above it, when `>=2` distinct `paid_by` members have contributed to that goal, render:
  - Sorted member list with avatar initials, first name, `₹total`, proportional bar, `%` (member sum / goal total contributions).
- Keep the existing "Recent contributions" list unchanged (already last 5 desc).

### Change 5 — Goal edit modal with target_date
- Currently `SavingsGoalDialog` is create-only and `target_date` is full-day. Refactor:
  - Accept optional `goal?: FinanceSavingsGoal` and `autoFocusDate?: boolean` props. When `goal` is passed, prefill all fields, change title to `"Edit Savings Goal"`, change submit button to `"Save Changes"`, and call `useUpdateSavingsGoal` instead of create (wire onSave through parent).
  - Replace day-precision Calendar with a month+year picker. Implementation: two `<Select>` controls (Month: Jan–Dec, Year: current year .. +20). Stored value = first day of selected month, `YYYY-MM-01`. Label changes to `"Target date (optional)"`. Display formatted as `"MMM yyyy"`.
  - When `autoFocusDate`, scroll/focus the month select on mount.
- In `FinanceSavings.tsx`: add `editTarget` state; the Case B link sets `editTarget = { goal, focusDate: true }`; render a second `<SavingsGoalDialog>` instance bound to it.

No AI copy, no other layout changes.

---

## Files touched
- `src/pages/FinanceBudget.tsx` (F-15 all 3 changes)
- `src/pages/FinanceSavings.tsx` (F-16 changes 1–4 + wiring 5)
- `src/components/finance/SavingsGoalDialog.tsx` (F-16 change 5: edit mode + month/year picker)

No DB migration. No new hooks. No edge functions.