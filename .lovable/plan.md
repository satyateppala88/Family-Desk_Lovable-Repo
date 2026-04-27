# Plan: Modular onboarding — basics first, depth on first visit

## Goal

Replace today's 5-step monolithic onboarding with:
- A short **initial onboarding** (basics + module picks) right after signup.
- Per-module **blocking first-run setup modals** the first time a user opens an enabled module.
- A **revamped Settings** page that shows household basics + a separate edit card *only* for each enabled module.

## 1. Slim initial onboarding

File: `src/components/onboarding/UserPreferencesOnboarding.tsx` (rewritten, kept at the same route `/onboarding/preferences`).

Steps reduced to **2**:
1. Profile + household basics — display name, household type, adults, children (+ ages), seniors.
2. Module selection — reuses the existing `ProductSelectionStep`.

On submit:
- Saves display name to `profiles.display_name`.
- Saves only the basics columns to `household_preferences` (everything else stays NULL until the relevant module asks).
- Writes the chosen modules to `household_enabled_products`.
- Routes to `/dashboard`.

The current detailed steps (dietary, cooking, routine, budget) are removed from this flow — their inputs become per-module setup.

## 2. Per-module first-run setup

New shared infra:
- `src/lib/moduleSetup.ts` — `ModuleSetupKey` type (`meals_setup`, `grocery_setup`, `finance_setup`, `habits_setup`, `calendar_setup`, `tasks_setup`) and a tiny config map (title, description, fields).
- `src/hooks/useModuleSetup.ts` — wraps `profiles.completed_tours` (per memory `features/user-onboarding/tour-tracking`) to read/mark a setup as complete. Reuses the same JSONB column with new keys; no migration needed.
- `src/components/onboarding/ModuleSetupGate.tsx` — wraps a page; if the corresponding setup key is missing in `completed_tours`, renders a **blocking modal** (cannot dismiss without completing or "Skip for now") that captures only that module's inputs and persists them, then marks the key complete.

Wiring (one-line wrap on each page):
- `src/pages/Meals.tsx` → diet_type, food_allergies, religious_restrictions, spice_level, regional_cuisines, cooking_skill_level, weekday_cooking_time, preferred_meal_types.
- `src/pages/Grocery.tsx` → pantry_size, shopping_frequency, shopping_locations, organic_preference.
- `src/pages/Finance.tsx` → monthly_grocery_budget, budget_consciousness.
- `src/pages/Habits.tsx` → household_concerns (subset relevant to habits), preferred_task_time.
- `src/pages/Calendar.tsx` → work_schedule, festival_importance.
- `src/pages/TaskmasterToday.tsx` → preferred_task_time only (skip if already set by another module).

Each modal writes straight into `household_preferences` (existing table, RLS already in place) and calls `markModuleSetupComplete(key)`. A "Skip for now" button is allowed but the modal will reappear on next visit until completed (per the user's request that this is *blocking*).

## 3. Settings page revamp

File: `src/pages/Settings.tsx` plus new card components in `src/components/settings/`.

Layout (top → bottom):
- Household Management (kept).
- **Household Basics** card (kept, uses `EditHouseholdBasicsDialog`).
- **Module preferences** section — renders one card per *enabled* product only:
  - Meals → `EditDietaryPreferencesDialog` + `EditCookingPreferencesDialog`.
  - Grocery → new `EditGroceryPreferencesDialog` (pantry/shopping/organic).
  - Finance → new `EditFinancePreferencesDialog` (budget + budget_consciousness).
  - Tasks/Habits/Calendar → `EditRoutinePreferencesDialog` (already covers work_schedule, preferred_task_time, festival_importance, household_concerns).
  - Each card has an "Edit" button and a small "Re-run setup" link that clears the matching `completed_tours` key so the first-run modal replays next time the module is opened.
- HowToUse / WhatsNew / Terms / Privacy cards (kept).

Disabled modules don't render their card at all. Reuse `useEnabledProducts(householdId)` for the gating.

Two new dialog components (`EditGroceryPreferencesDialog`, `EditFinancePreferencesDialog`) follow the same pattern as the existing edit dialogs — controlled state, `updatePreferences` from `useHouseholdPreferences`.

## 4. Backwards compatibility

- Existing households that already filled in all preferences keep working — Settings just shows whichever cards correspond to enabled modules; the per-module modals do not pop because the legacy users will be backfilled with all `*_setup` keys on first load (one-time migration in `useModuleSetup`: if all relevant prefs are already non-null, mark the key complete automatically). This avoids re-asking long-standing users.
- `bumpVersion` minor entry will be added automatically by the auto-bump plugin on next deploy; no manual changelog change required.

## Technical notes

- No DB migration needed (reuses `profiles.completed_tours` and `household_preferences`).
- `FeatureName` type in `useFeatureTour.ts` is left untouched; the new setup keys live alongside existing tour keys in the same JSONB.
- `ModuleSetupGate` is rendered just inside each page component before the main content, so the rest of the page is dimmed/blocked but the Header and AI chat remain usable.
- Re-running setup from Settings clears the key via the same supabase update used by `WhatsNewSection`'s tour-replay button — keeps the codebase consistent.
- All copy stays terse and Indian-household friendly, matching existing onboarding tone.
