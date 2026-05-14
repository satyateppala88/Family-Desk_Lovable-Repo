## Welcome modal re-shows every visit + stacks behind permission sheet — fix

### Root cause

1. **Welcome modal re-appears.** `Index.tsx` triggers the welcome via `useFeatureTour("dashboard")`, whose `markTourComplete` does a full `UPDATE profiles SET completed_tours = { ...completedTours, dashboard: true }`. `completedTours` is captured at mutation-creation time. On a fresh session — before the `["completed-tours", uid]` query has resolved — that closure value is `{}`, so the write **clobbers** every other tour completion. On the very next dashboard load the same query returns `{}` again (because the prior session's data was wiped), so `shouldShowTour` flips back to `true` and the modal re-mounts.
2. **Permission sheet stacks behind it.** The `useEffect` at `Index.tsx:104` fires `ensurePermission("notifications", …)` 2s after mount with no awareness of `runOnboarding` / `shouldShowTour`, so the permission sheet opens while the Joyride welcome is still on screen.

### What to change

#### 1. `src/pages/Index.tsx` — switch the welcome to a dedicated, patch-based persistence

Replace the `useFeatureTour("dashboard")` usage **only for the welcome modal** with a small inline check + RPC write:

- Read `completed_tours` directly from the existing `["completed-tours", user?.id]` query (already populated by `useFeatureTour` for other features). If `completed_tours.dashboard_welcome === true`, **never** set `runOnboarding`.
- Gate the existing "open after 500ms" effect on `completedToursLoaded === true && completed_tours?.dashboard_welcome !== true`.
- In `handleOnboardingComplete` (called from Joyride Finish/Skip/Close), call the existing SQL function `public.update_completed_tour('dashboard_welcome')` via `supabase.rpc("update_completed_tour", { _key: "dashboard_welcome" })`. That function does `completed_tours || jsonb_build_object(_key, to_jsonb(now()))` — a true patch that never overwrites siblings. After it returns, `setQueryData(["completed-tours", uid], { ...prev, dashboard_welcome: true })` so the local cache reflects the change immediately.
- Stop calling `markTourComplete()` from `useFeatureTour("dashboard")` for this modal so we don't re-introduce the clobber.

The existing `useFeatureTour` hook is **not modified** — other tours (tasks/meals/grocery/habits/calendar/taskmaster) keep their current behaviour exactly as-is, per the user's "do not change any other tour logic" constraint.

#### 2. `src/pages/Index.tsx` — guard the permission primer

- Add `welcomeVisible = runOnboarding || shouldShowWelcome` (where `shouldShowWelcome` is the boolean computed in step 1).
- In the notifications `useEffect`: bail out while `welcomeVisible` is `true`. When it flips to `false`, start a **500 ms** timeout before calling `ensurePermission("notifications", "dashboard-first-load")`. (Drop the existing 2 s timer so the two timings don't compose.)
- Conditionally render `<PermissionPrimerDialog {...primerProps} />` only when `!welcomeVisible`. This satisfies "if welcome modal is visible, do not mount the permissions sheet".

#### 3. No DB migration

The column (`profiles.completed_tours jsonb`) and the RPC (`public.update_completed_tour(text)`) already exist. The new key `dashboard_welcome` is just a new entry inside the same jsonb — no schema change.

### Out of scope
- Other tours, the `useFeatureTour` hook, save/skip handlers in module setup gates, and any unrelated dashboard logic.

### Verification
1. Sign in fresh → visit `/dashboard` → "Welcome to FamilyDesk" appears → click **Finish**. Reload `/dashboard` → modal does **not** re-appear.
2. Inspect `profiles.completed_tours` for the user → contains `"dashboard_welcome": "<timestamp>"` and any pre-existing keys are preserved.
3. On the same first visit, the "Gentle, useful nudges" sheet does **not** overlap the welcome — it appears 500 ms after the welcome is dismissed.
4. Other tours (tasks/meals/etc.) still trigger normally on their first visit.