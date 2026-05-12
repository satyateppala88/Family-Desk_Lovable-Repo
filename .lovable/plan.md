## Plan: Fix habit_logs and meal_plans unique constraints

Apply two schema fixes via a single migration.

### 1. `habit_logs` — add user_id to uniqueness
Current unique constraint is `(habit_id, log_date)`, which causes one member's log to overwrite another's for shared/household habits. Drop the existing 2-column unique constraint and add `(habit_id, log_date, user_id)`.

### 2. `meal_plans` — add unique on (household_id, week_start_date)
Required so upsert-based `createMealPlan` works correctly.

### Technical details

Note: Postgres does not support `ADD CONSTRAINT IF NOT EXISTS` for `UNIQUE`. I'll use a `DO` block guard or `CREATE UNIQUE INDEX IF NOT EXISTS` instead. Plan: use unique indexes (idempotent) rather than table constraints — upsert `onConflict` works with either.

```sql
-- habit_logs: drop old 2-col unique, add 3-col
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.habit_logs'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2;
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.habit_logs DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_log_user_uniq
  ON public.habit_logs (habit_id, log_date, user_id);

-- meal_plans: unique per household/week
CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_household_week_uniq
  ON public.meal_plans (household_id, week_start_date);
```

### Risk check
Before running, I'll check Live for duplicate rows that would block the new unique indexes:
- `habit_logs` duplicates on `(habit_id, log_date, user_id)` (unlikely; old constraint was stricter on those 2 cols)
- `meal_plans` duplicates on `(household_id, week_start_date)` — `useMealPlans.createMealPlan` already deletes prior plans before insert, but historical duplicates may exist

If duplicates exist, I'll surface them and ask how to resolve before applying.

### Files
- One new migration file. No code changes needed (hooks already use these conflict targets).
