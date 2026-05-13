# Plan: Mobile layout + avatar fixes

## 1. Dashboard module grid (`src/pages/Index.tsx` line 202)
Change the grid classes to:
```
grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 module-grid
```
(Was `lg:grid-cols-4 xl:grid-cols-5`. Mobile already used 2 cols; the explicit replacement matches the requested classes.)

## 2. Finance hub sub-module grid (`src/pages/Finance.tsx` line 147)
Change to:
```
grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4
```
(Drops the `sm:grid-cols-3` middle step per the request.)

## 3. Avatar initials use the wrong source (`src/components/layout/Header.tsx`)
The current `getInitials()` already reads `user.user_metadata.display_name`, but the rendered "TT" suggests that field is empty/stale and something else is filling in. Two changes:
- Extend the existing `profile-avatar` query to also `select("avatar_url, display_name")`.
- Rewrite `getInitials()` to prefer the profile's `display_name`, then `user.user_metadata.display_name`, then the email local-part, then `"U"`. This guarantees the initials always come from the authenticated user's profile, never the household name.

## Verification
- Resize preview to 390px and confirm Dashboard shows 2 columns and Finance hub shows 2 columns with no horizontal scroll.
- Confirm header avatar shows the test user's initials (e.g. "TU" for "Test User") on `testuser@dealcompass.test`.

No DB, edge function, or routing changes.
