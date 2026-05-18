# FIX-12 — Household Context, Home Empty State, Install Badge

## Findings from codebase exploration

- `useHousehold` (`src/hooks/useHousehold.ts`) already uses React Query with `enabled: !!user` and 5-min staleTime — household persists across navigation via the cache. There is **no `HouseholdProvider`** that could unmount.
- `App.tsx` already wraps routes with `QueryClientProvider` → `AuthProvider` → `PrivacyModeProvider` → `BrowserRouter`. Correct order.
- Dependent hooks (`useEnabledProducts`, `useOnboardingProgress`, `useDashboardStats`, `useHabits`, realtime hook) all have `enabled: !!householdId` guards.
- `useHabits` already passes `household_id: householdId` on insert and invalidates `["habits", householdId]` on success.

**So Part 1 / Part 4 are already structurally correct.** The actual bug surface is in two specific places:

1. **`src/pages/Index.tsx`** keeps a separate `useState<Household | null>(household)` populated by a one-off `useEffect` fetch from the `households` table. On every remount of `Index` (which happens because the page is lazy-loaded and rendered fresh on each `/` visit), this state starts as `null`, so the page either:
   - shows the skeleton until the extra fetch resolves, or
   - if that fetch silently fails / RLS misbehaves, gets stuck rendering nothing useful.
   It also creates a redundant network call. This is the realistic source of the "empty home after navigation" symptom.

2. **`src/components/install/InstallAppButton.tsx`** shows the "App installed ✓" badge whenever `isStandalone()` is true — forever. No 10-minute / new-install check.

## Plan

### Part 1 — Household context (verify only, no code changes)
Document that `useHousehold` already lives in the React Query cache with the required `enabled: !!user` guard, and that all consuming hooks already use `enabled: !!householdId`. No restructuring needed.

### Part 2 — Home screen empty / loading / error states (`src/pages/Index.tsx`)
1. Drop the local `useState<Household | null>` + `useEffect` fetch. Use `householdName` / `householdAvatarUrl` already returned by `useHousehold()` (and pass `householdId` itself as the unique identifier).
2. Loading guard becomes simply `if (isLoading) { … PageLoadingGrid … }` — page never blanks waiting on a redundant second fetch.
3. After `isLoading === false` and still no `householdId`, the existing `useEffect` already redirects to `/household-setup` — keep that.
4. Add an **error / no-data card** for the rare case where `useHousehold` errors out (or returns null while the user is logged in and the redirect hasn't fired):
   - Single muted card: "Having trouble loading your home — Tap to retry".
   - Button calls `queryClient.invalidateQueries({ queryKey: ["household"] })`.
   - Expose `error` and `refetch` from `useHousehold` (small hook tweak: also return `error` and `refetch` from the underlying `useQuery`).
   - Show this card only on `error` (React Query already auto-retries twice per `query-client.ts`).
5. Header `household.name` reference becomes `householdName`. `household.avatar_url` (not currently used on Home) is irrelevant.

### Part 3 — Install badge (`src/components/install/InstallAppButton.tsx`)
1. Import `useAuth` from `@/contexts/AuthContext`.
2. Compute:
   ```ts
   const isNewInstall = !!user?.created_at &&
     (Date.now() - new Date(user.created_at).getTime()) < 10 * 60 * 1000;
   ```
3. In the `if (installed)` branch: `return null` unless `isNewInstall`. The rest of the component (install CTA when not installed) is unchanged.

### Part 4 — Habits across navigation
No code change required after Part 2 — `useHabits` already has the right guards, the right invalidations, and writes `household_id` on insert. Verify the symptom is gone after Part 1+2 ship. The prompt's diagnostic `SELECT * FROM public.habits WHERE household_id IS NULL` can be run separately if it recurs; no preemptive change.

## Files touched
- `src/pages/Index.tsx` — remove local household state + extra fetch, add error/retry card.
- `src/hooks/useHousehold.ts` — also return `error` and `refetch` from underlying `useQuery`.
- `src/components/install/InstallAppButton.tsx` — gate "App installed" badge on 10-min `user.created_at` window.

## Out of scope
- No changes to home layout, module grid, or card styling.
- No changes to Habits UI, creation flow, or RLS.
- No new HouseholdProvider — React Query cache already provides this.
