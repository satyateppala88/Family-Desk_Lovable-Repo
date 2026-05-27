# Trends prod crash + Transactions page UI

## A. /finance/trends blank in production

Most likely causes, ranked by probability based on the recent diff:

1. **Stale Service Worker serving the old HTML** (highest probability). `vite-plugin-pwa` registers a SW in production; on the previous deploy the Trends route resolved a chunk that no longer exists in the new build, and the cached HTML still points at it. Symptom: blank screen / `ChunkLoadError` in console on `/finance/trends`, while other already-cached routes work.
2. **Render throw in `FinanceTrends.tsx`** if `MonthlyAggregate.bySavingsCategory` is ever `undefined` at runtime (e.g. an older React Query persisted cache, or a future bucket constructed elsewhere). `Object.entries(m.bySavingsCategory)` would throw before the page paints.
3. Recharts on a hidden/sized-zero container — unlikely because preview works.

### Fix

1. **Defensive guards in `src/pages/FinanceTrends.tsx`**
   - `Object.entries(m.bySavingsCategory || {})` (and same for `byCategory` while we're there).
   - `(row[c] = (m.bySavingsCategory || {})[c] || 0)`.
   - One-line — eliminates hypothesis 2 entirely.

2. **SW self-heal on chunk load failure** in `src/main.tsx`
   Add a `window.addEventListener("error", …)` that detects `ChunkLoadError` / "Loading chunk … failed", calls `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`, clears `caches.keys() → caches.delete(...)`, and reloads once (guarded by a sessionStorage flag so it can't loop). This is the standard fix for stale-SW chunk misses after a Vite PWA deploy and protects every route from this category of bug, not just Trends.

3. **Diagnose-only confirmation step**
   Ask the user to open DevTools → Console on `https://familydesk.in/finance/trends` and paste the first red error. If it's `Failed to fetch dynamically imported module` / `ChunkLoadError`, it's #1; if it's `Cannot read properties of undefined (reading 'entries')`, it's #2. Both are covered by the fixes above.

No DB / RLS changes.

## B. Transactions page — split list and analytics

**Problem:** `FinanceTransactions.tsx` stacks `TransactionAnalyticsPanel` (category/member/week breakdown with expand-all and an internal scroll) directly above the transaction list inside the same `<main>` scroll container. When many categories exist, the panel grows tall, the body scroll fights the panel's internal scroll (touch event capture), and reaching the transaction list becomes effectively impossible on mobile.

**Redesign — two tabs at the page level:**

```
┌─ Header (Month switcher + All-time toggle) ──────────┐
├─ Tabs:  [ Transactions ]  [ Insights ]  [ Members ]  │
├─ — Transactions tab —                                │
│    Search + filter chips                             │
│    Transaction rows (the only scroll surface)        │
│                                                      │
├─ — Insights tab —                                    │
│    TransactionAnalyticsPanel (full height,           │
│      categories expand inline, page scroll only)     │
│                                                      │
├─ — Members tab — (existing "members" tab content)    │
└──────────────────────────────────────────────────────┘
```

Specifics:

- `FinanceTransactions.tsx` already has `activeTab` state (`"list" | "members"`). Extend to `"list" | "insights" | "members"`.
- Move the `<TransactionAnalyticsPanel ... />` JSX from inline (between MonthSwitcher and the filter chips) into the new `"insights"` tab branch. Pass the same props.
- In `TransactionAnalyticsPanel.tsx`: remove the `collapsed` / `scrollCollapsed` / `IntersectionObserver` logic — it was a workaround for the embedded layout. Always render fully expanded inside the Insights tab. Drop `showAllCats` cap or raise it (since the user is on a dedicated tab they want the full list).
- Cross-tab interactivity: tapping a category in Insights still sets `catFilter` and auto-switches the active tab back to `"list"` so the user immediately sees the filtered transactions. Same for selecting a member.
- Touch scroll: with the analytics panel gone from the list view, the list scroll is the only vertical scroll on that tab. No `touch-action` overrides needed.

Mobile-first; no desktop-only behavior changes. No data hooks change.

## Out of scope

- No edits to the Savings page or `useFinanceTrends` hook.
- No new endpoints / migrations.
