# Verification: Security hardening migration

I checked the live database against every item in your SQL block. **Everything in the script is already applied.** Running it would either be a no-op or, in the case of `push_subscriptions`, actively wrong (it would try to recreate the table with a different shape).

## Item-by-item audit

### 1. `finance_transactions` RLS — already secured
- RLS: **enabled**
- Policies present (semantically equivalent to your script, using `EXISTS` instead of `IN`):
  - `Members can view finance transactions` (SELECT)
  - `Members can create finance transactions` (INSERT)
  - `Members can update finance transactions` (UPDATE)
  - `Members can delete finance transactions` (DELETE)
- All scoped to `household_members` for `auth.uid()`. **Data is not public.**

### 2. `household_members` RLS — already secured
- RLS: **enabled**
- `Members can view household members` uses the `is_household_member(auth.uid(), household_id)` SECURITY DEFINER function. This is **better** than your proposed self-referential subquery, which would risk infinite recursion on RLS evaluation. Keep the existing policy.

### 3. `households` RLS — already secured
- RLS: **enabled**
- `Members can view their households` already restricts SELECT to households the user belongs to. Admin UPDATE/DELETE/INSERT policies also present.

### 4. `habit_logs` unique constraint — already exists
- `habit_logs_habit_id_log_date_user_id_key UNIQUE (habit_id, log_date, user_id)` is present. The DO-block in your script would find no matching old constraint and the ADD would be a no-op.

### 5. `meal_plans` unique constraint — already exists
- `meal_plans_household_id_week_start_date_key UNIQUE (household_id, week_start_date)` is present.

### 6. `push_subscriptions` — exists, but with a different (correct) schema
This is the one place the script is **not safe to run**. The table already exists with the Web Push standard shape used by `supabase/functions/push-subscribe` and `send-push`:

```text
id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at
```

Your `CREATE TABLE IF NOT EXISTS` would be skipped (so no harm), but the assumption behind it (a single `subscription jsonb` column with a `UNIQUE(user_id, subscription)` index) does not match production. RLS is already enabled with four owner-scoped policies (SELECT/INSERT/UPDATE/DELETE on `user_id = auth.uid()`).

Also note: PostgreSQL does not support `CREATE POLICY IF NOT EXISTS` or `ADD CONSTRAINT IF NOT EXISTS` (those are syntax errors on current PG versions). Running the script as written would fail at parse time before applying anything.

## Recommendation

**Do not run this migration.** The intent behind every clause is already satisfied by the current schema and policies, and the `push_subscriptions` block encodes a stale assumption about that table's shape.

If you want, I can instead:
1. Run the Supabase linter to surface any *actual* current security gaps, or
2. Generate a one-page summary of all current RLS policies on these six tables for your records.

Just tell me which (or both) and I'll switch to build mode to do it.
