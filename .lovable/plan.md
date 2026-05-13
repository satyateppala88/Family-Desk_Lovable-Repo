## Goal
Stop blasting users with 6 module setup dialogs after signup. Reduce upfront onboarding to 3 steps (basics → modules → confirmation), defer per-module questions to the first time the user opens that module (as a friendly bottom sheet), and strip the per-module welcome tours. Most of the plumbing already exists — this is mostly removing upfront triggers and re-skinning the gate.

## Current state (relevant)
- `src/components/onboarding/UserPreferencesOnboarding.tsx` is already 2 steps, but on completion it queues up every newly-enabled module's setup dialog back-to-back via `ModuleSetupQueue`. **This is the "6 modals" the user is seeing.**
- `src/components/onboarding/ModuleSetupGate.tsx` already gates each module's first visit, backed by `household_preferences.completed_module_setups` (jsonb). It uses a centered `Dialog`, not a bottom sheet, and explicitly defers itself behind the per-module welcome tour.
- `OnboardingTour` (react-joyride) currently runs on first visit of `/`, `/meals`, `/grocery`, `/habits`, `/calendar`, `/tasks`, gated by `profiles.completed_tours`.

## Changes

### 1. Onboarding becomes 3 steps — `src/components/onboarding/UserPreferencesOnboarding.tsx`
- Bump `TOTAL_STEPS` to `3`.
- Step 0 (basics) and Step 1 (product selection) — unchanged content.
- Step 2: new "You're all set!" confirmation card (large check icon, friendly subtitle, single primary button "Go to dashboard" → `navigate("/dashboard")`).
- Run `handleComplete` (the existing DB writes) when the user advances from Step 1 to Step 2, so by the time they see the confirmation, everything is saved. Show a small inline saving state on Step 1's Next button while the writes run.
- **Remove the `ModuleSetupQueue` flow entirely:** drop the `setupQueue` state, the `<ModuleSetupQueue …/>` render, the `setSetupQueue(newlyEnabled)` branch, and the import. After save we either advance to Step 2 (success) or stay on Step 1 with a toast (failure).

### 2. Module setup becomes a first-open bottom sheet — `src/components/onboarding/ModuleSetupGate.tsx`
- Swap the centered `Dialog` shell used by `ModuleSetupDialog` for a shadcn `Sheet` with `side="bottom"`, rounded top corners, `max-h-[85vh]` scroll body. Keep all internal form logic, draft persistence, save guards, and `useModuleSetup` plumbing as-is — only the chrome changes.
- Header: module icon (lucide) + "Quick setup for [Module Name]" using the existing `MODULE_SETUP_META` titles ("Meals", "Grocery", "Calendar", "Finance", "Habits/Routine"). Add an `icon` field to `MODULE_SETUP_META` referencing the same lucide icons used on the dashboard module cards (`UtensilsCrossed`, `ShoppingCart`, `Calendar`, `Wallet`, `Leaf`) so visual identity matches.
- Footer buttons: primary "Set up now" (saves), secondary "Skip, I'll do this later" (calls `markComplete` so it never shows again; module falls back to existing defaults — no preferences written).
- Remove the `MODULE_TO_FEATURE_TOUR` deferral block in `ModuleSetupGate` (no per-module tours anymore, so nothing to wait for).
- Storage note: completion is already persisted as a jsonb map in `household_preferences.completed_module_setups`. We'll keep household scope (matches the project's household-centric core rule) instead of duplicating it onto `profiles.modules_setup_completed`. No migration required. **Flagging this as a deviation from the literal spec — confirm if you want a per-user column instead.**

### 3. Remove per-module welcome tours
- Strip `OnboardingTour` + `useFeatureTour` imports, state, and JSX from: `src/pages/Meals.tsx`, `src/pages/Grocery.tsx`, `src/pages/Habits.tsx`, `src/pages/Calendar.tsx`, `src/pages/Tasks.tsx`. Leave the rest of each page untouched.
- `src/pages/Index.tsx`: keep the dashboard tour, but reduce `defaultSteps` (or pass a custom `steps` prop) to a single welcome tooltip ("Welcome to FamilyDesk — your family's hub. Tap a card below to dive in."). Still gated by `useFeatureTour("dashboard")` + `markTourComplete`.
- `src/lib/moduleSetup.ts`: drop the `MODULE_TO_FEATURE_TOUR` export (only consumer is being removed).
- `OnboardingTour.tsx` and `useFeatureTour.ts` stay (still used by the dashboard).

### 4. Cleanup
- Delete `src/components/onboarding/ModuleSetupQueue.tsx` (no remaining importers after Change 1).
- Update `src/components/onboarding/UserPreferencesOnboarding.test.tsx` for the 3-step flow and the removal of the queue.
- Memory: update `mem://features/user-onboarding/tour-tracking` and the relevant onboarding memory file to reflect "no per-module tours; setup is just-in-time bottom sheet on first module open".

## Out of scope
- No routing changes (the same `/onboarding/preferences` → `/dashboard` flow is preserved).
- No changes to `ProductSelectionStep` (Step 1 content) or to `/household-setup` (household name creation).
- No changes to `useHouseholdPreferences`, RLS, or any DB schema.
- No edits to the actual per-module form bodies inside `ModuleSetupGate.tsx` — only the dialog/sheet chrome around them.

## Technical notes
- Bottom-sheet pattern matches the existing `MoreSheet` and AI Assistant sheet conventions.
- Backfill behavior in `useModuleSetup` (auto-mark complete when relevant household pref fields are already populated) is preserved, so existing households are unaffected.
- Step 2's "Go to dashboard" replaces the implicit "Finish" → first module sheet jump, so the confirmation screen also doubles as the moment React Query has finished invalidating `enabled-products` etc.
