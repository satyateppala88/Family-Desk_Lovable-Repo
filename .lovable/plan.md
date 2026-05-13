## Findings on the proposed SQL

I checked the database before planning. Most of this migration is already in place, and a couple of statements would actually break things if run as-is.

### 1. finance_transactions RLS — already done ✅
RLS is enabled and there are already 4 policies (SELECT/INSERT/UPDATE/DELETE) restricting access to household members via `household_members`. The proposed policies are semantically identical to the existing ones. No change needed.

### 2. household_members RLS — already done ✅ (and the proposed policy is dangerous)
RLS is enabled. Existing policies already scope visibility to the user's households via the `is_household_member` SECURITY DEFINER function.

The proposed `own_household_only` policy queries `household_members` from inside a `household_members` policy. Postgres will throw **infinite recursion detected in policy** — this is exactly why the project uses `is_household_member()` instead of an inline subquery.

### 3. households RLS — already done ✅
RLS is enabled and a SELECT policy already restricts to member households. No change needed.

### 4. habit_logs unique constraint — needs change ⚠️
Current constraint: `UNIQUE (habit_id, log_date)` — this prevents two household members from both logging the same habit on the same day. We should replace it with `UNIQUE (habit_id, log_date, user_id)`.

Note: `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS UNIQUE (...)` is not valid Postgres syntax. Need a `DO $$ ... $$` guard or plain `ADD CONSTRAINT`.

### 5. meal_plans unique constraint — needs to be added ⚠️
No unique constraint exists today. We should add `UNIQUE (household_id, week_start_date)` so the meal-plan deduplication logic (delete-before-insert per week) can rely on it and upserts work.

Same syntax caveat as above.

### Other syntax issues in the pasted SQL
- `CREATE POLICY IF NOT EXISTS` is only supported on Postgres 16+; safer to use `DROP POLICY IF EXISTS … ; CREATE POLICY …`.
- `ADD CONSTRAINT IF NOT EXISTS <name> UNIQUE (…)` is not valid; must be guarded with a `DO` block or `pg_constraint` lookup.

---

## Proposed migration (only the parts that are actually needed)

```sql
-- habit_logs: allow per-user uniqueness instead of per-habit/day
ALTER TABLE public.habit_logs
  DROP CONSTRAINT IF EXISTS habit_logs_habit_id_log_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.habit_logs'::regclass
      AND conname = 'habit_logs_habit_id_log_date_user_id_key'
  ) THEN
    ALTER TABLE public.habit_logs
      ADD CONSTRAINT habit_logs_habit_id_log_date_user_id_key
      UNIQUE (habit_id, log_date, user_id);
  END IF;
END $$;

-- meal_plans: one plan per household per week
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meal_plans'::regclass
      AND conname = 'meal_plans_household_id_week_start_date_key'
  ) THEN
    ALTER TABLE public.meal_plans
      ADD CONSTRAINT meal_plans_household_id_week_start_date_key
      UNIQUE (household_id, week_start_date);
  END IF;
END $$;
```

### Pre-flight check before running
Both new constraints will fail if duplicate rows already exist. I'll run these checks against Test first and clean up duplicates if any are found:

```sql
SELECT habit_id, log_date, user_id, COUNT(*)
FROM public.habit_logs
GROUP BY 1,2,3 HAVING COUNT(*) > 1;

SELECT household_id, week_start_date, COUNT(*)
FROM public.meal_plans
GROUP BY 1,2 HAVING COUNT(*) > 1;
```

### What I will NOT run
The RLS sections (1, 2, 3) from your pasted SQL — already implemented correctly, and section 2 in particular would introduce infinite recursion.

Confirm and I'll execute the migration above (Test first; Live applies on publish).