# Plan: AdminRoute, admin routes, useHousehold queryFn

## 1. AdminRoute component
`src/components/layout/AdminRoute.tsx` already exists with the requested implementation (auth + platform-admin checks, skeleton fallback, redirects to `/auth` and `/`). No change needed.

## 2. App.tsx route wrappers
Both routes already use `AdminRoute`:
- `/admin/access-requests` — wrapped at line 100-107
- `/admin/permission-analytics` — wrapped at line 232-236

No change needed.

## 3. useHousehold queryFn
Replace the current queryFn in `src/hooks/useHousehold.ts` with the user-supplied version. Net differences from current:
- Drops the `!inner` modifier on the `households(...)` embed, so a `household_members` row whose join silently fails no longer causes the whole query to return null and crash dependent code.
- Removes the `order("created_at", { foreignTable: "households" })` clause (no longer needed without `!inner`; matches the spec).
- Selects `households(onboarding_completed, name, avatar_url)` instead of also pulling `created_at`.

Return shape stays identical, so no consumers need updating.

## Verification
- Sign in with a brand-new user (no household) and confirm Index doesn't crash and routes to household setup.
- Sign in with the test user and confirm household name + avatar still render in the header.

No DB, edge function, or routing changes.
