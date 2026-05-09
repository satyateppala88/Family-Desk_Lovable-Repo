## What I found

The architecture can support synchronous household updates, but production is currently not fully wired for it.

Key finding: in production, only these tables are enabled for realtime change events:

```text
task_comments
tasks
```

But the app is subscribing to many shared household tables such as finance cards, transactions, budgets, groceries, habits, meal plans, household members, etc. Since those tables are not in the production realtime publication, other household members will not receive live update events for most modules. They may only see changes after manual refresh, cache expiry, or navigating away/back.

I also checked the test backend: it has the expected realtime tables enabled. So this looks like a Test vs Live schema/publication drift issue, not a fundamental limitation of the multi-user household model.

## Recommended fix

Implement a focused household realtime hardening pass, without removing individual users.

### 1. Repair Live realtime publication coverage

Create a safe migration that idempotently adds the shared household tables to realtime publication and ensures full row payloads for update/delete events.

Tables to include:

```text
household_members
household_enabled_products
household_family_members
projects
tasks
task_assignees
task_comments
daily_plans
daily_plan_items
meal_plans
meal_plan_items
shopping_lists
shopping_list_items
pantry_items
finance_accounts
finance_transactions
finance_budgets
finance_savings_goals
finance_subscriptions
finance_user_cards
finance_custom_cards
finance_custom_categories
finance_monthly_snapshots
habits
habit_assignees
habit_logs
habit_scores
habit_streaks
household_habit_goals
ai_suggestions
calendar_settings
```

This will be written defensively so duplicate publication entries do not break the migration.

### 2. Add one household-level realtime sync provider

Add a single app-level component, e.g. `HouseholdRealtimeProvider`, mounted inside authenticated routes/app shell, that subscribes once per logged-in household to the major shared tables and invalidates the relevant React Query caches.

This avoids the current page-by-page pattern where realtime only runs if a user happens to be on that page. With the provider, if one member changes finance, grocery, habits, or household settings, other logged-in members get cache invalidation even if they are on another module.

### 3. Expand and normalize query invalidation keys

Update realtime invalidation so it covers both list queries and dependent summaries, for example:

```text
finance_transactions -> finance-transactions, finance-monthly-summary, finance-dashboard, finance-snapshot
finance_user_cards/custom_cards -> user-cards, custom-cards
pantry_items -> pantry-items, pantry-stats, dashboard-stats
shopping_list_items -> shopping-lists
habits/logs/scores/streaks -> habits, habit logs, stats, leaderboard
household_members/family_members -> members, member emails, household, admin checks
household_enabled_products -> enabled-products, onboarding progress
```

### 4. Make realtime subscriptions easier to debug

Improve the existing `useRealtimeSubscription` hook to:

- log subscription status in development/preview,
- expose channel errors/timeouts clearly,
- keep production silent unless there is a meaningful failure,
- avoid unnecessary random channel churn.

This will make future sync issues much easier to pinpoint.

### 5. Reduce stale-cache windows for shared household data

Some queries use long stale times, and the app persists React Query cache in production. That is good for offline support, but bad if realtime is missing or delayed.

I will reduce stale windows for frequently edited shared data and add safer refetch behavior for critical shared modules. The offline experience remains, but online users should see current household state faster.

### 6. Keep local optimistic updates, but rely on realtime for other members

Current optimistic updates are useful for the member making the change. I will keep that pattern, but ensure other members get the server-confirmed update via realtime invalidation.

## Why I do not recommend removing users for this issue

The data sync problem is not caused by having individual users under one household. It is caused by production not publishing most shared tables to realtime, plus fragmented page-level subscriptions and cached data.

Removing users would be a much larger rewrite and would reduce security/auditability, while still needing household-level realtime and cache invalidation. Fixing realtime is the direct solution.

## Expected outcome

After implementation and publish:

- When one household member adds/removes a card, transaction, grocery item, habit log, task, etc., other logged-in household members should see the update automatically.
- Shared summaries should refresh too, not just raw lists.
- Members page and household settings should update more reliably.
- Offline cache still works, but should no longer mask fresh online data for long periods.

## Validation plan

I will verify by checking:

1. Production realtime publication includes all intended shared tables after publish.
2. The frontend has a single household-level subscription active for the current household.
3. Finance cards, finance transactions, grocery pantry/list, habits, and household members all invalidate the correct query keys.
4. No security weakening: RLS remains household-based and user-specific where needed.

## Files likely to change

- `supabase/migrations/...` new migration for realtime publication coverage
- `src/hooks/useRealtimeSubscription.ts`
- new `src/components/realtime/HouseholdRealtimeProvider.tsx` or similar
- `src/App.tsx`
- selected hooks/pages where duplicate or missing realtime subscriptions need cleanup/coverage, especially finance cards/custom cards, household products, family members, and dashboard-related queries