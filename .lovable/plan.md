## Goal

Make "Add Transaction" feel instant and immune to duplicate submits. Optimistic insert is already in place — the residual lag/risk comes from (a) `onSuccess`+`onSettled` re-invalidating the transactions list (forcing a refetch and brief flash) and (b) the dialog's local 600 ms re-enable timer that isn't tied to the real mutation state.

## Files

- `src/hooks/useFinance.ts` — `useCreateTransaction`
- `src/components/finance/TransactionDialog.tsx`
- `src/pages/FinanceTransactions.tsx`
- `src/pages/FinanceSavings.tsx`
- `src/components/dashboard/QuickActionsRow.tsx`

## Changes

### 1. `useCreateTransaction` (useFinance.ts)

Keep the existing optimistic `onMutate` and the in-place `onSuccess` replacement (lines 480–489). Then:

- In `onSuccess`, remove `invalidateQueries({ queryKey: ["finance-transactions", householdId] })` (line 490). The cache already holds the real row.
- Drop the `onSettled` block entirely. It re-invalidates `finance-transactions` and the summaries already invalidated in `onSuccess`, causing a redundant refetch that can briefly flicker the new row.
- Keep these invalidations in `onSuccess` only (summary/aggregate queries that genuinely need a recompute):
  `finance-monthly-summary`, `finance-snapshot`, `finance-dashboard`, `finance-annual-budget`, `finance-budgets`.
- On error rollback path, no change.

Net effect: the optimistic row stays on screen, gets swapped to the server row in place, no list refetch, no flicker.

### 2. `TransactionDialog.tsx`

- Add an optional `isSaving?: boolean` prop.
- Compute `const disabled = isSaving || submitting;` and use it for the footer Button's `disabled`.
- Button label: `"Saving…"` when `disabled`, otherwise `"${initialData ? "Update" : "Add"} Transaction"`.
- Keep the existing local `submitting` flag (covers callers that don't pass `isSaving`), but no other behavior changes.

### 3. Caller wiring

Pass the live mutation pending state into the dialog so the button stays locked until the mutation settles:

- `FinanceTransactions.tsx`: `<TransactionDialog ... isSaving={createTx.isPending} onSave={(data) => createTx.mutate(data)} />` for both the add and edit instances (edit can pass `updateTx.isPending`).
- `FinanceSavings.tsx`: same pattern for whichever create/update mutation it wires.
- `QuickActionsRow.tsx`: same — pass `createTx.isPending` to the dialog instance there.

No change to `mutationFn`, no DB or schema changes, no new files.

## Result

- New transaction appears instantly on click (already optimistic) and no longer briefly disappears, because the list query is no longer invalidated post-insert.
- Button is disabled the moment the user clicks and stays disabled until the mutation succeeds or errors — preventing double submissions across the dialog and any reopen race.
