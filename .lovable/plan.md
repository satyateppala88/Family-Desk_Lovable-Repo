# Plan: Pantry refresh, banner, logo, and habit conflict checks

## 1. Pantry list blank after Quick Add Staples
Root cause is **not** a missing invalidation — `bulkAddItems` already invalidates `["pantry-items", householdId]`. The real problem: `QuickAddChecklist` writes items with `category: "Staples"`, but `DEFAULT_CATEGORIES` has no "Staples" card, so `PantryCategoryGrid` (which only renders cards for known categories) hides them. The pantry header counts items, but the body shows nothing.

Fix in `src/components/grocery/PantryCategoryGrid.tsx`:
- After `categoryStats` is computed, build the displayed list as the union of `categories` plus any extra `stats` keys not present in `categories` (rendered with a default icon and a high `sort_order` so they appear at the end). This guarantees no item is invisible regardless of the household's seeded categories.

Also align future inserts in `src/components/grocery/QuickAddChecklist.tsx`:
- Rename the "Staples" group's `category` value to `"Other"` (which exists in `DEFAULT_CATEGORIES`) so newly added Salt/Sugar/Tea/etc. land in a real category card. Keep the section heading inside the dialog as "Staples" for clarity.

(Belt-and-suspenders) In `src/pages/Grocery.tsx` `handleBulkAdd`, attach an `onSuccess` to the `mutate(...)` call that re-invalidates `["pantry-items", householdId]` and `["pantry-stats", householdId]` so the user's stated expectation is also met directly.

## 2. Grocery subtitle
`src/pages/Grocery.tsx` line 464 already toggles between "Start building your pantry inventory" and "X items in your pantry". No change needed — verify in preview after the fix above.

## 3. Continue Setup banner stuck at 20%
In `src/pages/Index.tsx`, the banner renders whenever `!onboardingCompleted`, regardless of the percentage. Update the conditional to also hide when:
- `progressData.percentage >= 100`, OR
- every enabled module's `MODULE_SETUP_KEYS` entry is `true` in `preferences.completed_module_setups` (covering the case where users completed module-setup gates but haven't filled the legacy onboarding fields).

Implementation: read `preferences.completed_module_setups` via the existing `useHouseholdPreferences(householdId)` hook (already used elsewhere) and `enabledProducts` (already in scope). Compute `allModuleSetupsDone` and gate the banner on `!onboardingCompleted && progressData.percentage < 100 && !allModuleSetupsDone`.

## 4. Pre-auth logo
`src/pages/HouseholdSetup.tsx` imports `logo-family-desk-primary.png` (old AI placeholder). Replace with `familydesk-lockup.png` (the same asset Auth.tsx uses) and update the `alt` to `"FamilyDesk"`. Auth page already uses the correct asset — no change.

## 5. Habit upsert onConflict
`src/hooks/useHabits.ts` line 243 already reads `onConflict: "habit_id,log_date,user_id"`. No change required — confirmed.

## Verification
- Open Grocery, run Quick Add → select Salt → confirm card appears under "Other" with subtitle "1 items in your pantry".
- Confirm dashboard banner disappears once setups complete.
- Visit `/auth` and `/household-setup`; both show the FamilyDesk lockup.

No DB, edge function, or routing changes.
