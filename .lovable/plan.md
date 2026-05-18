## Households to delete

| ID | Name | Onboarded | Created |
|---|---|---|---|
| `9828cda5-5b78-40e6-adba-8ad527b0dd02` | Test Household | yes | 2026-01-28 |
| `094d8b3c-13b9-4573-90ef-c34eb6369bbc` | Satya's Home | no | 2026-02-11 |

The DB has **no FK constraints** in the `public` schema, so nothing cascades — every related row must be deleted explicitly. Will be done in a single transactional `supabase--insert` call against **Live (production)**.

## Deletion order

**1. Child rows (reference a per-household parent by id):**
- `ai_messages` where `conversation_id ∈ ai_conversations(household)`
- `daily_plan_items` where `daily_plan_id ∈ daily_plans(household)` OR `task_id ∈ tasks(household)`
- `meal_plan_items` where `meal_plan_id ∈ meal_plans(household)`
- `shopping_list_items` where `shopping_list_id ∈ shopping_lists(household)`
- `task_assignees`, `task_comments` where `task_id ∈ tasks(household)`
- `habit_assignees`, `habit_logs`, `habit_streaks`, `user_habit_badges` where `habit_id ∈ habits(household)`
- `challenge_logs`, `challenge_participants` where `challenge_id ∈ household_challenges(household)`
- `pantry_item_usage` where `pantry_item_id ∈ pantry_items(household)`
- `finance_chat_messages` where `session_id ∈ finance_chat_sessions(household)`
- `finance_transactions` where `account_id ∈ finance_accounts(household)` (also deleted again via household_id below — safe)

**2. All tables with a `household_id` column** (38 tables, excluding the `calendar_connections_safe` view):
`ai_conversations, ai_suggestions, calendar_connections, calendar_settings, daily_plans, dietary_preferences, finance_accounts, finance_budgets, finance_chat_sessions, finance_custom_cards, finance_custom_categories, finance_monthly_snapshots, finance_savings_goals, finance_subscriptions, finance_transactions, finance_user_cards, habit_coach_recommendations, habit_scores, habits, household_challenges, household_enabled_products, household_family_members, household_habit_goals, household_invitations, household_members, household_preferences, manual_calendar_events, meal_plans, pantry_categories, pantry_items, projects, recipes, shopping_lists, task_categories, tasks, user_roles`

**3. Finally:** `DELETE FROM households WHERE id IN (...)`.

## Not touched
- `auth.users` and `profiles` — users keep their accounts (one of these households belongs to a live user with another household).
- Storage objects in `avatars` — household-level avatars, if any, are not removed (bucket is keyed by user, not household).
- Edge function logs, pgmq queues — not household-scoped.

## Confirmation
This is destructive and irreversible. Approving the plan will execute the deletes in one SQL batch wrapped in `BEGIN ... COMMIT`.