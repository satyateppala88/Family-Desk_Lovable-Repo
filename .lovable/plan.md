

# Plan: Mobile-First App Launch Flow

## Overview
Replace the landing page with a native-app-style launch flow: Splash → Onboarding carousel (first launch only) → Auth → existing post-auth flows. Remove the invite-only signup restriction.

## New Components

### 1. `src/components/launch/SplashScreen.tsx`
- Full-screen branded splash with Family Desk logo and name
- Auto-dismisses after ~1.5s via a timeout, calling an `onComplete` callback
- Warm gradient background matching existing design system

### 2. `src/components/launch/OnboardingIntro.tsx`
- 3-screen horizontal carousel using simple state-based pagination (no heavy library)
- Dot indicators at bottom, "Skip" button top-right on all screens
- Screen content as specified (titles + body copy)
- Final screen: primary "Get Started" CTA → navigates to `/auth?tab=signup`, secondary "I already have an account" → `/auth?tab=signin`
- On Skip or completing: sets `localStorage.setItem("familydesk_has_seen_intro", "true")`

### 3. `src/components/launch/AppEntryGate.tsx`
- Wraps the app's route decision logic
- Launch sequence:
  1. Show SplashScreen (always, ~1.5s)
  2. After splash: check `useAuth()` — if authenticated → render children (normal routes)
  3. If not authenticated: check `localStorage.getItem("familydesk_has_seen_intro")` — if not seen → show `OnboardingIntro`; if seen → navigate to `/auth`

## File Changes

### `src/App.tsx`
- Remove `Landing` import
- Change `"/"` route: instead of `<Landing />`, render `<AppEntryGate>` which handles splash → onboarding → auth redirect
- Keep all other routes unchanged

### `src/pages/Auth.tsx`
- **Remove lines 107-123** (the `is_email_approved` RPC check) so signup is open to everyone
- **Remove lines 464-469** (the "Request early access" link)
- Read `?tab=signup` or `?tab=signin` from URL search params to set default tab, so onboarding CTAs can deep-link to the right tab

## Persistence Logic
- Key: `familydesk_has_seen_intro` in localStorage
- Set to `"true"` when user completes or skips onboarding
- Abstracted into a small helper (`src/lib/launchStorage.ts`) with `getHasSeenIntro()` / `setHasSeenIntro()` so it can be swapped for native storage later

## What stays unchanged
- All authenticated routes and ProtectedRoute logic
- Homepage module grid, header navigation
- Email verification flow
- Household setup and onboarding preferences flow
- All other pages and components

## Files to create
| File | Purpose |
|------|---------|
| `src/lib/launchStorage.ts` | localStorage helpers for intro flag |
| `src/components/launch/SplashScreen.tsx` | Branded splash screen |
| `src/components/launch/OnboardingIntro.tsx` | 3-screen intro carousel |
| `src/components/launch/AppEntryGate.tsx` | Launch state router |

## Files to edit
| File | Change |
|------|--------|
| `src/App.tsx` | Replace Landing route with AppEntryGate |
| `src/pages/Auth.tsx` | Remove invite-only check, remove "request access" link, support `?tab` param |

