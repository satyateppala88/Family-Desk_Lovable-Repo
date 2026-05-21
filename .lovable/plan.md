## BUG-FIX-E1/E2 — Invitation duplicate-member guard + banner cleanup

**File: `src/components/household/PendingInvitationBanner.tsx`**

1. **Pre-filter the query** so already-joined households never show as invitations:
   - After fetching invitations by email + `status='pending'`, fetch the current user's `household_members` (just `household_id`) and filter the result in JS to exclude those household_ids. (Doing it client-side avoids a complex Supabase nested query and is cheap — both lists are tiny.)
   - Add `["household-members", user.id]` to the queryKey deps so it refreshes when membership changes.

2. **Guard the accept mutation** (`acceptMutation.mutationFn`):
   - Before the `household_members` insert, run a `select id ... maybeSingle()` on `household_members` for `(household_id, user_id)`.
   - If a row exists: skip the insert, still update the invitation row to `status='accepted'`, return `{ alreadyMember: true }`.
   - Otherwise proceed with existing insert + invitation update + welcome/response emails.

3. **Handle duplicate-key + cleanup in callbacks**:
   - `onSuccess(result)`: invalidate `["my-pending-invitations"]` + `["household-members"]` + `["household"]`. Toast "You're already a member of this household." when `result.alreadyMember`, otherwise the existing success toast. Keep the existing `window.location.replace("/dashboard")` only on the genuine-join path; on `alreadyMember` just close the banner (don't force reload).
   - `onError(error)`: if `error.code === '23505'` (or message contains `household_members_household_id_user_id_key`), invalidate the invitations query and show the gentle "already a member" toast instead of the raw error.

## BUG-FIX-E3 — Savings goal creation visibility

Investigation shows `useCreateSavingsGoal` already has optimistic updates + `invalidateQueries(["finance-savings-goals", householdId])` on success and settled. Most-likely remaining gap is the page render.

**File: `src/pages/FinanceSavings.tsx`** (and `SavingsGoalDialog` caller):
- Confirm the empty-state branch is gated behind `isLoading` (currently `{isLoading ? ... : goals.length === 0 ? <EmptyState /> ...}`) — verify and tighten if needed.
- Ensure the dialog closes via `onOpenChange(false)` inside `onSuccess` (not before the mutation resolves) so the user sees the new card immediately.
- Add `refetchOnMount: "always"` to the savings-goals query (in `useFinanceSavingsGoals`) for the safety-net path.

## BUG-FIX-E4 — Pantry count + Budget item display delay

**Pantry** (`src/hooks/usePantryItems.ts`):
- Existing `addPantryItem.onSuccess` already invalidates `pantry-items`, `pantry-stats`, `dashboard-stats`. Add `["pantry-count", householdId]` and `["grocery-summary", householdId]` defensively in case dashboard widgets use those.
- Apply same set to `updatePantryItem` and `deletePantryItem`.

**Budgets** (`src/hooks/useFinance.ts`, `useUpsertBudget`):
- Already invalidates `["finance-budgets", householdId]`. Also invalidate `["finance-dashboard", householdId]` so the hub summary updates.
- In `FinanceBudget*` pages, add `refetchOnMount: "always"` to the budgets query.

## Global FIX-10 audit sweep

Grep for every `useMutation({` in `src/hooks/**` and `src/pages/**`. For each, verify `onSuccess` invalidates at least one query key. Focus list:

- ☐ Grocery list items (`useShoppingLists.ts`)
- ☐ Meal plans (`useMealPlans.ts`)
- ☐ Habit logs (`useHabits.ts`)
- ☐ Subscriptions (`useSubscriptions.ts`)
- ☐ Manual calendar events (`useManualCalendarEvents.ts`)
- ☐ Tasks (`useTasks.ts`, `useTaskmaster.ts`, `useProjects.ts`)
- ☐ Household members (`useHouseholdMembers.ts`) + invitations
- ☐ Profile updates (account settings)
- ☐ Custom categories / custom cards (`useCustomCategories.ts`, `useCustomCards.ts`)

For each missing invalidation, add the appropriate `queryClient.invalidateQueries({ queryKey: [...] })` call following the codebase convention `[entity, householdId]`. Keep changes minimal — only add invalidation; do not change mutation semantics.

## Verification

- Accept an invitation as a user who is already a household member → no error toast, gentle "already a member" message, banner disappears, no duplicate row attempt.
- Create a savings goal → card appears in list before dialog close finishes; refresh page confirms it persists.
- Add a pantry item → grocery hub / home pantry count updates without navigation.
- Create a budget → row shows in the budgets list immediately.
- Spot-check 2–3 audited mutations (e.g. add subscription, complete habit) → UI updates without manual refresh.

## Scope guardrails

- No schema changes.
- No edge-function changes.
- No UI redesign — invalidation + small render-gating only.
