# Stop the "preferences" prompt loop

## What's actually happening

Three independent mechanisms each re-prompt for preferences. Any one of them firing makes it feel like the app is constantly asking for setup.

### 1. Login redirect (the worst offender)

`src/pages/Auth.tsx` (lines 201–215) runs this on every successful sign-in:

```ts
const { data: householdData } = await supabase
  .from("households")
  .select("onboarding_completed")
  .eq("id", memberData.household_id).single();

if (!householdData?.onboarding_completed) {
  navigate("/onboarding/preferences");   // ← every session start
  return;
}
```

If the user ever opened the onboarding wizard but didn't reach the final "Finish" tap (closed the tab, hit back, lost network at the upsert, joined a household that someone else created without finishing setup), `households.onboarding_completed` stays `false` forever — so **every login** drops them back into the wizard.

### 2. Per-module non-dismissible gate

`src/components/onboarding/ModuleSetupGate.tsx` wraps Finance, Grocery, Meals, Tasks, Habits, Calendar. It opens a **non-dismissible** dialog (no X, no Esc, no outside-click) whenever `useModuleSetup(key).needsSetup` is true.

`useModuleSetup` only auto-completes when `MODULE_SETUP_FIELDS[key]` has data. For finance the required fields are `monthly_grocery_budget` + `budget_consciousness`. The new simplified `UserPreferencesOnboarding` (post-rewrite) **doesn't collect any of these**. Result: the user finishes onboarding, opens Finance → blocked by "Budget setup" dialog. Closes the tab → opens Finance tomorrow → blocked again. Same for Grocery (`pantry_size`, `shopping_frequency`), Meals, etc.

The session replay confirms this: user is on `/finance`, sees a "Preferences updated!" toast (= `useHouseholdPreferences.updatePreferences`) after interacting with element 251 — that's the ModuleSetupGate dialog firing on entry.

### 3. Dashboard "Let's finish setting up" banner

`src/pages/Index.tsx` (lines 166–191) shows a CTA whenever `progressData.percentage < 100`. The percentage in `useOnboardingProgress` weights six categories totalling 100% — five of which depend on fields the new wizard no longer collects. So percentage is **permanently stuck at 20–40%** for users who completed the new wizard, and the banner never goes away.

---

## Fix (root cause, three changes)

### A. Login: stop redirecting on incomplete onboarding

In `src/pages/Auth.tsx` `handleSignIn`, drop the `onboarding_completed` redirect entirely. Always send signed-in users to `/dashboard`. The dashboard already exposes a clearly-labelled "Continue Setup" button for anyone who wants to finish — that's the right place to nudge, not a forced redirect on every sign-in. Leave the `household-setup` redirect (no household at all) intact, since that one really is required.

### B. Per-module gate: make it dismissible + remember the dismissal

In `src/components/onboarding/ModuleSetupGate.tsx`:
1. Render the dialog with `dismissible={true}` (it already accepts the prop on `ModuleSetupDialog`, the gate hard-codes `false` on line 306).
2. Add a "Skip for now" button that marks the module setup complete (`markComplete()`), so the user is never re-prompted on that module unless they explicitly choose to set it up from Settings.
3. Keep the "Save & continue" path unchanged — saving still upserts the fields and marks the key complete.

This converts the gate from a hard wall to a soft, one-time prompt per module. Re-running setup later is already possible via Settings → "Re-run onboarding" or by a new "Set up [module]" link in each module's empty state.

### C. Dashboard banner: only show when the wizard genuinely wasn't finished

In `src/pages/Index.tsx`, replace `progressData.percentage < 100` with `!onboardingCompleted`. The progress hook's percentage was designed for the old long-form wizard and is now misleading. The household-level `onboarding_completed` flag is the right signal for "did the user finish the simplified wizard". Once true, the banner disappears for good.

(Bonus: simplify `useOnboardingProgress` to only count what the current wizard actually captures — `productsSelected` + `householdBasics` — so the percentage on the Settings page also stops looking incomplete-by-default. Optional, but recommended for consistency.)

---

## Files to change

- `src/pages/Auth.tsx` — remove the `onboarding/preferences` redirect block in `handleSignIn`; always go to `/dashboard` once a household exists.
- `src/components/onboarding/ModuleSetupGate.tsx` — `ModuleSetupGate` passes `dismissible={true}` and adds a "Skip for now → markComplete" handler.
- `src/pages/Index.tsx` — banner condition changes from `progressData.percentage < 100` to `!onboardingCompleted`.
- (optional) `src/hooks/useOnboardingProgress.ts` — narrow the weighted criteria to what the new wizard collects.

No DB migration. No new tables. No backend changes.

## Verification after the fix

1. Sign out → sign in with an account whose `households.onboarding_completed = false` → should land on `/dashboard` (not `/onboarding/preferences`).
2. Open Finance/Grocery on a fresh household → setup dialog appears with a working "Skip for now" → close the tab → reopen Finance → no dialog the second time.
3. Dashboard banner gone for users with `onboarding_completed = true`, regardless of how many module-specific fields are blank.
