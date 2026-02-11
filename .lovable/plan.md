

# Fix Admin Functionality & Assign Platform Admin Role

## Current State

- The admin page exists at `/admin/access-requests` and the code is fully functional
- The `user_roles` table has an `app_role` enum that includes `platform_admin`
- However, **no user currently has the `platform_admin` role** -- only `household_admin` roles exist
- This means the RLS policies on `access_requests` block all reads/updates, so the admin page shows empty data for everyone
- The user `satyateppala@zohomail.in` (user_id: `a4cdc5e5-4e93-4e78-862a-401b6d0f816e`) needs to be made a platform admin

## Changes Required

### 1. Insert platform_admin role for satyateppala@zohomail.in

Run a database insert to add a `platform_admin` entry in the `user_roles` table:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a4cdc5e5-4e93-4e78-862a-401b6d0f816e', 'platform_admin');
```

The `household_id` column will be NULL for this row since `platform_admin` is a platform-level role, not household-scoped. This needs verification that the column is nullable (it appears to be based on the existing `has_household_role` function accepting a household_id parameter separately).

### 2. Verify the admin page works

After inserting the role, the admin page at `/admin/access-requests` should:
- Show all 6 existing access requests (currently visible in the database)
- Allow approving/rejecting pending requests
- Send decision emails via the `send-access-decision` edge function

### 3. Minor issue: No client-side admin guard on the route

Currently the route only uses `ProtectedRoute` (checks authentication). Any logged-in user can navigate to `/admin/access-requests` -- they'll just see an empty page because RLS blocks the data. This is functionally safe but gives a poor user experience.

**Fix:** Add a client-side check in `AdminAccessRequests.tsx` that verifies the user has the `platform_admin` role and redirects non-admins away (or shows an "unauthorized" message). This is a UX improvement, not a security fix -- the RLS policies already protect the data.

### 4. Add admin link in navigation for platform admins

Currently there's no way for the admin to discover the `/admin/access-requests` page from the UI. Add a conditional link in the Header dropdown menu that only shows for users with the `platform_admin` role.

---

## Technical Details

### Files to modify:

| File | Change |
|------|--------|
| Database (migration) | Insert `platform_admin` role for the user |
| `src/hooks/useIsPlatformAdmin.ts` | New hook to check if current user has `platform_admin` role |
| `src/pages/AdminAccessRequests.tsx` | Add unauthorized guard for non-admin users |
| `src/components/layout/Header.tsx` | Add conditional "Admin" link in dropdown for platform admins |

### New hook: `useIsPlatformAdmin`

```typescript
export const useIsPlatformAdmin = () => {
  const { user } = useAuth();
  
  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return { isAdmin, isLoading };
};
```

Note: This requires a SELECT RLS policy on `user_roles` that allows users to read their own roles. If one doesn't exist, it will need to be added.

