## Goal
Ensure the Manage Members page reflects member changes immediately, without requiring a hard refresh — for both in-app actions and direct DB/admin changes.

## Changes

### 1. `src/pages/HouseholdMembers.tsx`
- Add `useRealtimeSubscription` for the `household_members` table, filtered by `household_id=eq.<householdId>`, invalidating the `["household-members", householdId]` and `["household-member-emails", householdId]` query keys.
- Set `refetchOnWindowFocus: true` and a short `staleTime` (e.g. 0) on the members query so returning to the tab triggers a refetch.

### 2. Enable realtime publication for `household_members` (migration)
Run:
```sql
ALTER TABLE public.household_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.household_members;
```
(Wrapped in a guard so re-running the migration is safe.)

## Result
- When an admin adds/removes/role-changes a member (via app or direct DB), every other member's Manage Members page updates within ~1 second.
- Existing sessions like Satya's will pick up Rajashree as soon as the page is reopened or focused — no hard refresh needed.

## Files
- Edit: `src/pages/HouseholdMembers.tsx`
- New migration: enable realtime on `household_members`
