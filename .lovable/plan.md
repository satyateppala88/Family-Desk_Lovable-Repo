# Offline Caching for FamilyDesk PWA

Make Tasks, Daily Plan, Groceries & Pantry, Meals & Recipes, and Habits **viewable** when the device has no internet. Read-only — the app will clearly indicate it's offline and disable mutating actions until reconnected.

Reminder: like all PWA features, this only works in the **published** build (familydesk.in / familydesk.lovable.app), never in the Lovable editor preview iframe — the existing service-worker kill switch already enforces that.

## What the user will get

1. **App opens when offline.** All pages, scripts, fonts, and icons are precached by the service worker.
2. **Last-seen data appears instantly** for: today's tasks, this week's daily plan, shopping list & pantry, this week's meal plan + saved recipes, today's habits.
3. **Offline banner** at the top of the app: "You're offline — showing your last synced data" with the time of last sync. Auto-dismisses on reconnect.
4. **Mutating buttons disabled** when offline (e.g. "Add task", "Mark done", "Tick habit") with a tooltip "Reconnect to update". This matches the read-only scope you chose.
5. **Cache-then-network** for non-critical pages: shows cached page immediately, refreshes in background when online.

## Architecture

```text
Browser
  ├─ Service Worker (Workbox via vite-plugin-pwa)
  │   ├─ precache: app shell (JS, CSS, HTML, icons, fonts)
  │   └─ runtime caches:
  │        ├─ Supabase REST GETs   → StaleWhileRevalidate (24h)
  │        ├─ Google Fonts files   → CacheFirst (1y)
  │        └─ images / avatars     → CacheFirst (30d)
  └─ React Query
      └─ persistQueryClient → IndexedDB (idb-keyval)
          - persists every successful query for 7 days
          - on cold start, hydrates instantly from disk
          - background-refetches when network returns
```

Two layers cooperate: **Workbox** caches HTTP responses at the network layer (so the SW can serve them when the page makes a fetch), while **persistQueryClient** keeps React Query's in-memory cache on disk so the UI has data to render *before* any fetch even happens.

## Plan

### 1. Service worker runtime caching

Update `vite.config.ts` Workbox config to add `runtimeCaching` rules:

- **Supabase REST GETs** (`https://oohjebftkvlhpaljvijn.supabase.co/rest/v1/.*`) — `StaleWhileRevalidate`, max 200 entries, 24h. POST/PATCH/DELETE/PUT bypassed (they fail offline by design).
- **Edge function GETs** (`/functions/v1/.*` GET only) — `NetworkFirst` with 3s timeout, 1h cache.
- **Google Fonts CSS** — `StaleWhileRevalidate`.
- **Google Fonts files** (`fonts.gstatic.com`) — `CacheFirst`, 1 year.
- **Images** (`.png|.jpg|.jpeg|.webp|.svg`) — `CacheFirst`, 30 days, max 100 entries.

Keep `navigateFallbackDenylist: [/^\/~oauth/, /^\/auth\/callback/]` so OAuth redirects always hit the network.

### 2. React Query persistence

Add `@tanstack/react-query-persist-client` + `idb-keyval` based persister in `src/lib/query-client.ts`:

- `staleTime`: 5 min for most queries (so we still refetch when fresh online).
- `gcTime`: 7 days (cache survives unmount and is persisted).
- Persist only successful queries to IndexedDB under `familydesk-rq-cache`.
- Buster string tied to app version (auto-bumped) so a deploy invalidates stale shape.

Replace the `new QueryClient()` line in `src/App.tsx` with the persisted client + `PersistQueryClientProvider`.

### 3. Offline indicator

- `src/hooks/useOnlineStatus.ts` — listens to `online`/`offline` events, returns boolean + `lastOnlineAt` timestamp (persisted in localStorage).
- `src/components/layout/OfflineBanner.tsx` — slim top banner: WifiOff icon + "Offline — showing data from {relative time}". Slides down with motion when offline, slides up on reconnect (3s delay so flicker is avoided).
- Mounted once in `App.tsx` above the routes.

### 4. Disable mutations offline

- `src/hooks/useOnlineGuard.ts` — wraps a mutation handler; if offline, shows toast "You're offline — reconnect to make changes" and aborts.
- Apply to the highest-traffic mutating buttons in: Tasks (create/complete/delete), Habits (tick), Groceries (add/check), Pantry (add/edit), Meals plan (regenerate), Finance transactions (add/edit/delete).
- The disabled state is purely cosmetic UX; the SW already won't serve fake success for non-GET requests.

### 5. Cache warm-up on login

After auth, prefetch the offline-priority queries so the user has something to see if they go offline immediately:
- Today's tasks, this week's daily plan, shopping list, pantry items, this week's meal plan, today's habits.
- One small `prefetchOfflineEssentials(queryClient, householdId)` helper called from `AppEntryGate` after the household is resolved.

### 6. QA

- Unit tests for `useOnlineStatus`, `useOnlineGuard`, and the persister buster logic.
- Manual checklist (you'll run after publish):
  1. Load app online, navigate to Tasks/Groceries/Meals/Habits.
  2. Chrome DevTools → Network → Offline → reload — pages render with cached data, banner shows.
  3. Try to add a task — toast says "You're offline".
  4. Toggle online — banner disappears within ~3s, fresh data refetches.
  5. Cold-kill browser, go offline, reopen app — still loads.

## Out of scope (ask if you want any of these)

- Queued offline writes / background sync (you chose read-only).
- Conflict resolution / full offline-first sync.
- Caching AI Chat responses (they're conversation-specific).
- Caching Calendar/Google events (token expires, refetch always desired).

## Files I'll create or edit

New:
- `src/lib/query-client.ts` (persisted QueryClient factory)
- `src/hooks/useOnlineStatus.ts` + test
- `src/hooks/useOnlineGuard.ts` + test
- `src/components/layout/OfflineBanner.tsx`
- `src/lib/prefetch-offline.ts`

Edited:
- `vite.config.ts` (add `runtimeCaching` rules)
- `src/App.tsx` (use persisted client, mount banner)
- `src/components/launch/AppEntryGate.tsx` (call prefetch after household resolved)
- ~6–8 high-traffic mutation hooks/buttons across Tasks, Habits, Groceries, Pantry, Meals, Finance (wire `useOnlineGuard`)

New deps: `@tanstack/react-query-persist-client`, `idb-keyval`.

After approval I'll start with the QueryClient persistence + offline banner (most user-visible), then layer in Workbox runtime caching and the mutation guards.
