Plan to fix household settings persistence

1. Make every household settings edit dialog rehydrate from saved preferences when opened
   - Update the edit dialogs so they always initialise from the latest saved household preferences on open, not from stale component state.
   - This includes Household Basics, Finance, Dietary, Cooking, Grocery, Calendar, Habits, and Tasks preference dialogs.

2. Preserve previously saved values while saving partial edits
   - Ensure each dialog only submits fields it owns, so editing Finance will not overwrite Meals/Grocery/Calendar fields with defaults.
   - Make the shared `useHouseholdPreferences` save path use an upsert-style save for resilience, so settings can be created or updated without resetting unrelated values.

3. Align option values between setup and settings
   - Fix mismatched values currently present in setup forms, such as:
     - Finance: `over_20000`, `very`, `not_really` versus settings/database values like `above_20000`, `very_conscious`, `not_much`
     - Grocery: `biweekly` / `monthly` versus supported shopping frequency values
     - Calendar: `very` / `not_really` / `flexible` versus supported saved values
     - Routine: `night` versus the supported `flexible` task time
   - This prevents saved answers from appearing as defaults or blank when the user returns to edit them.

4. Improve cache refresh after saving
   - Keep invalidating `household-preferences` after saves, and add/update optimistic cache handling so the Settings screen reflects the saved values immediately after the dialog closes.

5. Add/adjust tests around persistence
   - Add tests for reopening settings dialogs after save to confirm previous choices appear.
   - Add regression checks that editing one module does not reset another module’s preferences.

Technical details

- Main files to update:
  - `src/hooks/useHouseholdPreferences.ts`
  - `src/components/settings/EditHouseholdBasicsDialog.tsx`
  - `src/components/settings/EditBudgetPreferencesDialog.tsx`
  - `src/components/settings/EditDietaryPreferencesDialog.tsx`
  - `src/components/settings/EditCookingPreferencesDialog.tsx`
  - `src/components/settings/EditGroceryPreferencesDialog.tsx`
  - `src/components/settings/EditCalendarPreferencesDialog.tsx`
  - `src/components/settings/EditHabitsTasksPreferencesDialog.tsx`
  - `src/components/onboarding/ModuleSetupGate.tsx`

- No database schema change is expected. Existing `household_preferences` table and RLS policies already support household-member reads/writes.