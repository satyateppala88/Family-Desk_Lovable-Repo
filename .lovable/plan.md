## Goal

Give users three ways to recover from stale data or a stuck UI:

1. **Pull-to-refresh** on every main page (mobile gesture).
2. **Refresh data** button in Settings — re-fetches everything without losing the session.
3. **Hard reload** button in Settings — clears caches + service worker and reloads (last-resort fix for stale production builds).

## What gets built

### 1. Pull-to-refresh (mobile)

- New component `src/components/layout/PullToRefresh.tsx` — lightweight touch-based wrapper (no extra dependency). Detects downward drag at `scrollTop === 0`, shows a spinner pill, and on release calls an `onRefresh` async callback.
- Wire it into the main app shell so it covers every authenticated route (Home, Tasks, Finance pages, Habits, Calendar, Grocery, Meals, etc.).
- On refresh, it invalidates the React Query cache (`queryClient.invalidateQueries()`), similar to what `SyncingIndicator` already does on reconnect.
- Disabled on desktop (>=1024px) and inside scroll containers that aren't at the top.

### 2. "Refresh data" button (Settings)

- Add a new **"App maintenance"** section to `src/pages/Settings.tsx`.
- **Refresh data** action:
  - `queryClient.clear()` + `queryClient.invalidateQueries()`
  - Toast: *"Refreshing your data…"* → *"All up to date."*
  - Does NOT touch auth, finance PIN, onboarding flags, or the persisted IndexedDB cache key beyond what invalidation rewrites.

### 3. "Hard reload" button (Settings)

- Same section, secondary/destructive style with a `ConfirmDialog`:
  *"This clears cached files and reloads the app. You'll stay signed in."*
- On confirm:
  1. Unregister all service workers (`navigator.serviceWorker.getRegistrations()` → `unregister()`).
  2. Clear Cache Storage (`caches.keys()` → `caches.delete()`).
  3. Delete the persisted React Query IndexedDB store (`familydesk` / `react-query`).
  4. `window.location.reload()` with a cache-busting query param.
- Auth session (Supabase localStorage / native bridge) and the finance PIN cache are preserved so the user doesn't get bounced to login.

### Microcopy

- Section title: **"App maintenance"**
- Subtitle: *"Use these if something looks stale or out of date."*
- Buttons: **Refresh data** (primary outline) and **Hard reload** (subtle destructive).
- Help text under Hard reload: *"Fixes most 'stuck screen' issues after an app update."*

## Files

- New: `src/components/layout/PullToRefresh.tsx`
- New: `src/components/settings/AppMaintenanceSection.tsx`
- Edit: `src/App.tsx` (or the shell wrapper) — mount `<PullToRefresh>` around authenticated routes
- Edit: `src/pages/Settings.tsx` — render `AppMaintenanceSection`
- Edit: `src/lib/query-client.ts` — export a helper to wipe the persisted IDB store (reuses existing `createStore`)

## Out of scope

- Per-page header refresh icons (not selected).
- Forcing a sign-out on hard reload.
- Any server-side cache invalidation.
