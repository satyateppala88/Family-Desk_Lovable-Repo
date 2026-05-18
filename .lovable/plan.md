# Systemic mutation fixes + realtime sync (B2, B4, B5, B6, B7 + FIX-10)

## Diagnosis (confirmed in code)

Two recurring anti-patterns explain B2/B4/B5/B6/B7:

1. **Success toast fired in `onMutate`, not `onSuccess`.** In `useSubscriptions.ts` (update + delete) and `useFinance.ts` (several savings-goal/transaction mutations), the success toast fires optimistically before the DB write resolves. If the Supabase call later errors (RLS, network), the UI says "Saved!" but data never persisted — exactly the B2 symptom (delete "succeeds" but row reappears on refresh).
2. **Inconsistent query keys between fetch and invalidate.** Fetches use `["finance-subscriptions", householdId]`, but updates/deletes invalidate the unscoped `["finance-subscriptions"]`. With React Query's prefix matching this *usually* works, but `useSubscriptions` update/delete also invalidate without `householdId`, so partial cache shapes can drift. Worse, several mutations never invalidate sibling caches that depend on the same row (e.g. budget edit doesn't touch `finance-transactions`; subscription edit doesn't touch `finance-budgets`).

Plus the cross-tab/cross-device staleness covered by FIX-10 (no realtime channels on finance tables).

## What to change

### 1. Mutation hygiene helper
Add `src/hooks/finance/mutationHelpers.ts` with:
- `toastOnSuccess` / `toastOnError` conventions (no success toast in `onMutate`).
- `financeInvalidate(qc, householdId, scope)` — single source of truth that invalidates the correct keyed list **plus** dependent keys:
  - `transaction` → transactions, monthly-summary, snapshot, dashboard, budgets, annual-budget, savings-goals
  - `budget` → budgets, annual-budget, dashboard
  - `savings-goal` → savings-goals, dashboard
  - `subscription` → subscriptions, budgets, dashboard
  - `category` → custom-categories, transactions (labels rerender)

### 2. Fix each hook
- **`useSubscriptions.ts`** (B7):
  - Move `toast.success` out of `onMutate` for update + delete.
  - Scope all `cancelQueries` / `invalidateQueries` to `[..., householdId]`.
  - Stop writing `status` in the update payload unless the form explicitly changed it (fixes Active→Paused side-effect — currently the form's default `status` overwrites the row).
  - Optimistic merge in `onMutate` keyed by the same `householdId` tuple so the edited card updates without reload.
- **`useFinance.ts` savings goal delete (B2):**
  - Verify the delete returns `data` via `.select().single()` and surface an error if 0 rows affected (RLS silently filtered).
  - Move success toast to `onSuccess`; on `onError` roll back optimistic removal and toast failure.
  - Scope invalidation to `[..., householdId]`.
- **`useCustomCategories.ts` create (B4):**
  - Use `.select().single()` and treat null/empty as error so UI doesn't show "Category added" on a swallowed insert.
  - Add structured `console.error` with `householdId`, `scope`, and PG error code.
- **`useFinance.ts` budget-member query (B6):**
  - New/updated query `useBudgetByMember` filters `finance_transactions` by `paid_by` (fallback to `created_by` when null).
  - One-time migration: `UPDATE finance_transactions SET paid_by = created_by WHERE paid_by IS NULL`.
- **B5 (placeholder — spec was truncated earlier):** add a stub fix only after the user confirms what B5 is. Plan reserves the slot but doesn't ship code.

### 3. FIX-10 — Realtime channels on finance tables
Use existing `useRealtimeSubscription` hook (already used on habits/tasks):
- New `src/hooks/finance/useFinanceRealtime.ts` that subscribes the current household to:
  `finance_transactions`, `finance_budgets`, `finance_savings_goals`, `finance_subscriptions`, `finance_custom_categories`.
- On any event, invalidate via `financeInvalidate` for the matching scope.
- Mount once from `src/pages/Finance.tsx` (and the finance hub layout) so every finance subpage gets cross-tab/cross-device sync.
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE …` for the 5 finance tables (skip if already added — guarded with `DO $$ … EXCEPTION WHEN duplicate_object`).

### 4. Verification
- Manual: delete a savings goal → reload → gone. Edit subscription Active → stays Active, UI updates without reload. Add custom category → row exists in DB.
- Network tab: confirm DELETE/UPDATE returns 200 with a row before the success toast appears.
- Open Finance in two tabs → mutation in tab A reflects in tab B within ~1s.

## Out of scope
- B3 (bar chart): code already uses width-percent; needs a screenshot before touching.
- B1 (budget delete button) and the visual side of B6 — already covered in the prior approved pass; this plan only addresses the systemic data-layer issues.
- B5 details — awaiting the truncated spec.

## Files touched
- `src/hooks/finance/mutationHelpers.ts` (new)
- `src/hooks/finance/useFinanceRealtime.ts` (new)
- `src/hooks/useFinance.ts`
- `src/hooks/useSubscriptions.ts`
- `src/hooks/useCustomCategories.ts`
- `src/pages/Finance.tsx` (mount realtime hook)
- New migration: enable realtime on 5 finance tables + backfill `paid_by`