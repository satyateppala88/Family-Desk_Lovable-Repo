## Database Fixes Analysis

After verifying the current database state against all 5 proposed fixes, only **Fix 4** is actually needed. The rest are already in place or target non-existent schema objects.

### What is needed

**Fix 4: Add unique constraint on `meal_plans(household_id, week_start_date)`**

The `meal_plans` table currently has a non-unique index on `(household_id, week_start_date)` but no unique constraint. The `assignRecipeToSlot` helper performs an upsert with `onConflict: "household_id,week_start_date"`, which fails with HTTP 400 because Postgres upsert requires a unique constraint/index to identify conflicting rows.

```sql
ALTER TABLE public.meal_plans
  ADD CONSTRAINT IF NOT EXISTS meal_plans_household_id_week_start_date_key
  UNIQUE (household_id, week_start_date);
```

### What is NOT needed

| Fix | Status | Reason |
|-----|--------|--------|
| Fix 1 — `finance_custom_categories` RLS | Already implemented | Table has RLS enabled with INSERT/SELECT/UPDATE/DELETE policies using `is_household_member(auth.uid(), household_id)`. |
| Fix 2 — `finance_subscriptions` RLS | Already implemented | Table has RLS enabled with all four policies using `EXISTS (SELECT 1 FROM household_members ...)`. |
| Fix 3 — `habit_challenges` RLS | Wrong table name | The actual table is `household_challenges`, which already has full RLS coverage (INSERT/SELECT/UPDATE/DELETE). |
| Fix 5 — `household_invitations` name | Not a schema issue | The table correctly stores `household_id`. The frontend (`PendingInvitationBanner.tsx`) already joins `households(name)` via Supabase foreign-key syntax. The `HouseholdInvitations` page does not display a household name because it is scoped to a single household. |

### If Bugs #13, #17, #23, #24 still reproduce

The proposed RLS fixes cannot be the root cause because those policies are already active. If the bugs still occur, the cause is likely in application logic (e.g., missing `household_id` in the INSERT payload, missing `started_by` field for challenges, or a frontend query/join issue). Those would need separate investigation.

### Scope of this plan

Apply **only Fix 4** (the `meal_plans` unique constraint). The other four fixes are redundant and should be skipped.