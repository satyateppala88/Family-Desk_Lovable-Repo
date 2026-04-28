## Problem

When updating feature preferences from Household Settings, the Setup flow (`UserPreferencesOnboarding.tsx`) calls:

```ts
supabase.from("household_preferences").upsert(payload, { onConflict: "household_id" })
```

But the `household_preferences` table only has constraints on `id` (PK) and a foreign key on `household_id` — there is **no UNIQUE constraint** on `household_id`. Postgres therefore rejects the upsert with:

> there is no unique or exclusion constraint matching the ON CONFLICT specification

A previous migration attempted to fix this for `household_enabled_products` but missed `household_preferences`.

Additionally, the Live database already contains duplicates (1 household has 4 preference rows), so we must dedupe before adding the constraint or it will fail.

## Fix

Single migration that:

1. **Dedupes** existing `household_preferences` rows — keep the most recently `updated_at` row per `household_id`, delete the rest.
2. **Adds** `UNIQUE (household_id)` constraint named `household_preferences_household_id_unique`.

```sql
-- 1. Remove duplicates, keeping the latest row per household
DELETE FROM public.household_preferences a
USING public.household_preferences b
WHERE a.household_id = b.household_id
  AND (a.updated_at < b.updated_at
       OR (a.updated_at = b.updated_at AND a.ctid < b.ctid));

-- 2. Add the missing unique constraint that the upsert relies on
ALTER TABLE public.household_preferences
  ADD CONSTRAINT household_preferences_household_id_unique
  UNIQUE (household_id);
```

After this migration, `upsert(..., { onConflict: "household_id" })` will succeed and existing settings will be preserved (latest row wins).

## Notes

- No code changes required — the hook/component logic is correct; the database schema was the missing piece.
- The dedupe keeps the freshest preference row, so the user's most recent settings are preserved.
- This complements the earlier `household_enabled_products` constraint fix.
