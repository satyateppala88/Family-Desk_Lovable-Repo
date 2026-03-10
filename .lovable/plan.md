

# Fix: Blank Page on Tasks Navigation

## Root Cause

There are two issues causing blank pages across the app:

### Issue 1: Broken RLS Policy (Critical)
The `household_invitations` table has an RLS SELECT policy called **"Users can view invitations by email"** that contains a subquery referencing `auth.users` directly:
```sql
invitee_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
```
The `authenticated` role does not have SELECT permission on `auth.users`, causing `permission denied for table users` (HTTP 403) every time this policy is evaluated.

This policy is hit by:
- `usePendingInvitations` hook (used in the **Header** component on every page)
- `PendingInvitationBanner` component (used on the Dashboard)

Since both hooks throw errors on failure and there is **no React Error Boundary** in the app, the unhandled error crashes the entire component tree, producing a blank page.

### Issue 2: Missing Error Resilience
The hooks that query `household_invitations` throw on error without graceful fallbacks, and the app has no Error Boundary to catch rendering failures.

## Plan

### Step 1: Fix the RLS Policy (Database Migration)
Replace the broken RLS policy with one that uses `auth.jwt()` instead of querying `auth.users`:

```sql
DROP POLICY "Users can view invitations by email" ON household_invitations;

CREATE POLICY "Users can view invitations by email"
  ON household_invitations
  FOR SELECT
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  );
```

This extracts the email from the JWT token directly, which is always available and requires no table access.

### Step 2: Add Error Resilience to Hooks
Update `usePendingInvitations` and `PendingInvitationBanner` to handle errors gracefully instead of throwing -- return empty arrays on error so the rest of the page still renders.

### Step 3: Add a Global React Error Boundary
Wrap the app in an Error Boundary component so that if any component crashes, users see a friendly fallback UI with a "Reload" button instead of a blank page.

## Technical Details

### Files to Modify
1. **Database migration** -- fix the `household_invitations` RLS policy
2. `src/hooks/usePendingInvitations.ts` -- catch errors gracefully, return `[]` instead of throwing
3. `src/components/household/PendingInvitationBanner.tsx` -- handle query errors gracefully
4. `src/App.tsx` -- add a React Error Boundary wrapper
5. New file: `src/components/layout/ErrorBoundary.tsx` -- Error Boundary component

### Production Impact
After publishing, the RLS fix will automatically apply to the Live database, resolving the 403 errors. No manual SQL needed for this change.

