## Goal

1. Apply the optimistic-update pattern (used in transactions) to **budgets, savings goals, subscriptions, and cards** so writes feel instant and submit buttons can't double-fire.
2. Make **all household data live across members** — when one member adds/edits/deletes anything in finance (or other shared modules), every other member sees the change without manually refreshing.

## What's already true (no change needed)

- RLS on every `finance_*` table already grants **all household_members** read/write access — so member B can already query member A's data; the gap is just stale React Query cache on B's device.
- `finance_transactions`, `finance_subscriptions`, `finance_savings_goals`, `finance_budgets`, `habits`, `habit_logs`, `tasks`, `meal_plans`, `pantry_items`, etc. are **already in the `supabase_realtime` publication**.
- A reusable `useRealtimeSubscription` hook already exists and is wired into Taskmaster pages.

So this is mostly a **frontend wiring** job, plus one tiny migration to add cards to realtime.

## Changes

### 1. Optimistic mutations in `src/hooks/useFinance.ts`
Apply the same pattern already used by `useCreateTransaction` to:
- `useUpsertBudget`
- `useCreateSavingsGoal`, `useUpdateSavingsGoal`, `useDeleteSavingsGoal`
- (also `useContributeSavingsGoal` if present)

Pattern per mutation:
- `.select().single()` to return the row
- `onMutate`: cancel queries, snapshot, push optimistic row into `["finance-budgets", householdId]` / `["finance-savings-goals", householdId]` caches via `setQueryData`, show toast immediately
- `onError`: restore snapshots, show error toast
- `onSuccess`: swap optimistic row with returned real row
- `onSettled`: light invalidate of dependent summary keys only

### 2. Optimistic mutations in `src/hooks/useSubscriptions.ts`
Same pattern for `useCreateSubscription`, `useUpdateSubscription`, `useDeleteSubscription`.

### 3. Optimistic mutations in `src/hooks/useUserCards.ts`
Same pattern for `useAddUserCard`, `useRemoveUserCard`.

### 4. Submit-button guards
Mirror the `submitting` state already in `TransactionDialog.tsx` for:
- `BudgetDialog.tsx`
- `SavingsGoalDialog.tsx`
- `SubscriptionDialog.tsx`
- `AddCardDialog.tsx`

Disable the save button while `mutation.isPending`, close dialog on click to prevent double-tap.

### 5. Cross-member live sync — wire `useRealtimeSubscription`
Add a single `useFinanceRealtime(householdId)` hook (in `src/hooks/useFinance.ts`) that subscribes to:
- `finance_transactions` → invalidates `finance-transactions`, `finance-monthly-summary`, `finance-dashboard`
- `finance_budgets` → invalidates `finance-budgets`
- `finance_savings_goals` → invalidates `finance-savings-goals`
- `finance_subscriptions` → invalidates `finance-subscriptions`
- `finance_user_cards` → invalidates `user-cards`

All filtered by `household_id=eq.<id>`. Mount it once at the top of each finance page (`Finance.tsx`, `FinanceTransactions.tsx`, `FinanceBudget.tsx`, `FinanceSavings.tsx`, `FinanceSubscriptions.tsx`, `FinanceCards.tsx`). One subscription per page is fine — it auto-cleans on unmount.

### 6. One small migration
Add `finance_user_cards` to the realtime publication (the only finance table currently missing):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_user_cards;
```

### 7. Extend live sync to other shared modules
Mount `useRealtimeSubscription` for already-published tables on their main pages so member B sees member A's changes instantly:
- `Habits.tsx` → `habits`, `habit_logs`, `habit_streaks` (add `habit_streaks` to publication too)
- `Meals.tsx` → `meal_plans`, `meal_plan_items`
- `Grocery.tsx` → `shopping_lists`, `shopping_list_items`, `pantry_items`
- `Calendar.tsx` → already covered if needed; skip if calendar uses Google sync only

Taskmaster already has it.

### Out of scope
- No RLS changes (already correct).
- No schema changes beyond the two `ALTER PUBLICATION` lines.
- No changes to AI chat / notifications.

## Result for the user
- Add/edit/delete in any finance area → UI updates in <50ms, no duplicate entries possible (button disabled).
- Member A adds a transaction / budget / goal / subscription / card on their phone → Member B's screen updates within ~1s automatically.
- Same live behavior extended to Habits, Meals, and Grocery.
