## Why she sees the old household

Rajashree (`rajashreeudupi88@gmail.com`) has **two `household_members` rows** in production:

1. `Teppalas` (created Nov 4, 2025) — only her, leftover from her first signup
2. `Teppala House` (created Feb 3, 2026) — the real household she shares with Satya

`useHousehold` runs `select household_id … limit(1).single()` with no `ORDER BY`, so Postgres returns whichever row it scans first. For her, that's the old "Teppalas" row, so the app loads the empty household every time. Satya only has one membership, so he's unaffected.

## Fix (two parts)

### 1. Data cleanup — production

Remove Rajashree's stale membership in the old "Teppalas" household, and (optionally) delete the now-empty household so it can't be picked up again.

```sql
-- Confirm the old household has no other members
SELECT count(*) FROM household_members
 WHERE household_id = 'f75725b0-6886-4add-b2f4-656b106fddfa';

-- Remove her membership in the old household
DELETE FROM household_members
 WHERE user_id = 'a59514a3-bc5e-4501-bbb4-b755821b1f2a'
   AND household_id = 'f75725b0-6886-4add-b2f4-656b106fddfa';

-- If no members remain, archive/delete the empty household
DELETE FROM households
 WHERE id = 'f75725b0-6886-4add-b2f4-656b106fddfa'
   AND NOT EXISTS (
     SELECT 1 FROM household_members WHERE household_id = 'f75725b0-6886-4add-b2f4-656b106fddfa'
   );
```

After this runs and she signs out + back in, she'll land in "Teppala House" with Satya.

### 2. Code hardening — `src/hooks/useHousehold.ts`

So this never silently happens again to anyone else:

- Replace the unordered `.limit(1).single()` with a deterministic query: select **all** memberships for the user, ordered by household `created_at DESC` (most-recently-joined wins), and pick the first.
- If a user has more than one membership, log a `console.warn` in dev so we catch it early.
- (Future, optional) Add a `last_active_household_id` column on `profiles` so users with multiple households can switch — out of scope for this fix.

### 3. Verify

- Run the prod SELECT again to confirm only one membership remains for her.
- Ask Rajashree to hard-refresh + sign in; confirm she sees "Teppala House" and Satya in Members.

## Files touched

- New migration: `supabase/migrations/<ts>_cleanup_rajashree_stale_household.sql` (data cleanup above)
- `src/hooks/useHousehold.ts` (deterministic ordering + dev warning)

No UI or RLS changes needed.