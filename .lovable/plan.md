# Welcome Feature Tour — animated carousel after install / first launch

## What we're building

A 7-screen interactive tour that introduces every module with a **realistic mock UI of that module pre-filled with sample data**, plays once per user, supports skip/back/next, and routes to sign-in or sign-up at the end.

- **Format:** Animated carousel (no MP4). Each screen = real-looking shrunken phone mock + headline + sub-copy + 1 micro-animation showcasing the module's "magic moment".
- **Trigger:** Plays once for both web first-time visitors AND when the PWA is installed (whichever comes first on a given browser).
- **Persistence:** localStorage flag (works pre-auth) + `profiles.completed_tours.feature_tour` JSONB key after sign-in (already-existing column — no migration). Tour is skipped if either is set.

```text
┌────────────────────────────┐
│ Skip                       │  (top-right, hidden on last)
│                            │
│   ┌─────────────────┐      │
│   │   PHONE MOCK    │      │  ← real-looking shrunken UI
│   │  with sample    │      │     of the module being shown
│   │  data + anim    │      │
│   └─────────────────┘      │
│                            │
│   Headline                 │
│   Sub-copy                 │
│                            │
│   • • ● • • • •            │  ← dots
│                            │
│   ◀  Continue  ▶           │  (Get started + Sign in on last)
└────────────────────────────┘
```

## The 7 screens

| # | Module          | Mock UI shows                                               | Micro-animation |
|---|-----------------|-------------------------------------------------------------|-----------------|
| 1 | Welcome (Hub)   | Hub home with 6 module tiles + "Family Pulse" banner        | Tiles stagger-fade in |
| 2 | Tasks           | "Today" plan with 3 tasks, AI reasoning chip                | One task ticks itself off |
| 3 | Meals           | 3-day rolling planner with breakfast/lunch/dinner cards     | "Generate week" pill pulses |
| 4 | Grocery         | Pantry list with categories + "Quick Add" row               | A meal-plan item slides into the list |
| 5 | Calendar        | Agenda view with 3 color-coded events from "family members" | Events cascade in from the right |
| 6 | Habits          | Today's habits with streak chips + green check rings        | Ring fills, +10 chip floats |
| 7 | Finance + AI    | Monthly snapshot + AI assistant bubble: "Spent ₹12,400 on dining — 18% over budget" | Typing dots → message appears |

Final CTA screen replaces 7th's bottom controls with **Get started** (sign-up) and **I already have an account** (sign-in), exactly like the current intro.

## Files

### New
- `src/components/launch/featureTour/FeatureTour.tsx` — orchestrator (state, swipe, dots, persistence write).
- `src/components/launch/featureTour/PhoneFrame.tsx` — shared rounded-bezel wrapper that scales the mock to fit any viewport.
- `src/components/launch/featureTour/screens/HubScreen.tsx`
- `src/components/launch/featureTour/screens/TasksScreen.tsx`
- `src/components/launch/featureTour/screens/MealsScreen.tsx`
- `src/components/launch/featureTour/screens/GroceryScreen.tsx`
- `src/components/launch/featureTour/screens/CalendarScreen.tsx`
- `src/components/launch/featureTour/screens/HabitsScreen.tsx`
- `src/components/launch/featureTour/screens/FinanceAiScreen.tsx`
- `src/hooks/useFeatureTourGate.ts` — single source of truth that returns `{ shouldShow, markComplete }`. Reads localStorage + `profiles.completed_tours.feature_tour` (if user is signed in).
- `supabase/migrations/<ts>_record_feature_tour_helper.sql` — small `update_completed_tour(_key text)` SQL function that merges a key into `profiles.completed_tours` for the current `auth.uid()` (RLS-safe, no schema change). Used by `markComplete()`.

### Edited
- `src/lib/launchStorage.ts` — add `getHasSeenFeatureTour() / setHasSeenFeatureTour()` (key `familydesk_has_seen_feature_tour_v1`).
- `src/components/launch/AppEntryGate.tsx` — replace the existing `OnboardingIntro` branch with the new `FeatureTour`. Behavior:
  - Splash → check `useFeatureTourGate()` → if not seen, show `<FeatureTour onFinish={...} />`. Otherwise navigate as today.
  - On finish: `markComplete()` (writes both localStorage and DB if logged in) → navigate to `/auth?tab=signup` or `/auth?tab=signin` based on which CTA was tapped.
- `src/main.tsx` (or new tiny `src/lib/installListener.ts` imported there) — listen for the `appinstalled` event and:
  - Mark a separate flag `familydesk_pwa_installed` (analytics-only).
  - The tour itself still plays once total — install doesn't re-trigger it. (We treat first-launch and post-install as the same "first real session", per the user's "Both" answer.)
- `src/pages/Settings.tsx` — under the existing "How to use" / "What's new" links, add **"Replay welcome tour"** button that clears both flags and navigates to `/welcome`.
- `src/App.tsx` — add a `/welcome` lazy route that mounts `<FeatureTour onFinish={() => navigate("/dashboard")}/>` so logged-in users can replay it.
- Delete or keep `OnboardingIntro.tsx`? **Keep** as a fallback for ultra-low-bandwidth (>2KB tour assets) — but it's no longer wired into the entry gate. We can prune later.

## Animation approach (lightweight, framework-free)

- Pure Tailwind + small CSS keyframes (`fade-up`, `slide-in-right`, `scale-in`, `stagger-fade-in` — all already in tailwind config).
- One in-screen "magic moment" animation per screen, triggered when that screen becomes active (via `data-active` attribute and CSS animation on entry). No `framer-motion`, no `requestAnimationFrame`, no MP4. Total cost: ~12 KB gzipped.
- Carousel transitions: horizontal slide using CSS `translate-x-[-Nvw]` on a track + `transition-transform duration-400 ease-out`. Touch-swipe via simple pointer events (no library).
- Respects `prefers-reduced-motion` — falls back to instant fades and disables the magic-moment animations.

## Persistence flow (precise)

```text
showTour =
  !localStorage[has_seen_feature_tour_v1]
  && (user ? !profile.completed_tours.feature_tour : true)
```

`markComplete()`:
1. `localStorage.setItem(has_seen_feature_tour_v1, ISO timestamp)`
2. If `user`: `supabase.rpc("update_completed_tour", { _key: "feature_tour" })`
   - SQL function uses `jsonb_set` on `profiles.completed_tours` for `auth.uid()`.
   - RLS-safe: function is `SECURITY DEFINER` with `set search_path=public`, only updates the caller's own row.

After auth, `AuthContext` already loads the profile — we just need to read `completed_tours.feature_tour` once on first hub mount and back-fill localStorage if the DB says it's seen (so the tour doesn't replay on a new device after sign-in).

## Out of scope (saving for follow-up)
- Per-language localization of mock-screen copy (English-only for v1).
- A/B testing variants of the tour ordering.
- Pulling real user-name / real household members into the mocks (we use friendly placeholder names like "Aarav", "Priya").
- Capacitor `appinstalled` parity — Capacitor first-launch is already covered by localStorage being empty on a fresh app install.

## Acceptance criteria

1. First visit on web (no PWA install) → tour plays end-to-end, finishes on `/auth`.
2. Install PWA on a fresh browser → tour plays once on next launch, doesn't replay.
3. Sign in on second device → tour does NOT replay (DB flag wins).
4. Tap **Skip** anywhere → tour ends, marked complete, lands on `/auth?tab=signup`.
5. **Settings → Replay welcome tour** clears flags and shows the tour again at `/welcome`.
6. `prefers-reduced-motion: reduce` → no in-screen animations, transitions reduced to fades.
7. Bundle size delta < 30 KB gzipped (no new heavy deps).
