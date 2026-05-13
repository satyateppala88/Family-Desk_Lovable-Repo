## Findings

The architecture already exists:
- `useFeatureTour` (per-user, `profiles.completed_tours`) drives the welcome tour.
- `useModuleSetup` (per-household, `household_preferences.completed_module_setups jsonb DEFAULT '{}'`) drives whether a module setup gate shows.

The DB column already exists. The bugs are in the wiring.

### Problem 1 — setup modal reappears every visit

In `src/components/onboarding/ModuleSetupGate.tsx` (the standalone `ModuleSetupDialog`), the inner `onSkip` handler reads:

```ts
if (!dismissible) await markComplete();
onSkip?.();
```

i.e. when `dismissible=true` (which the per-page `ModuleSetupGate` uses), clicking **Skip for now** intentionally does NOT persist completion — only the surrounding gate's `onOpenChange` does. But the footer's Skip button calls `skipRef.current?.()` which goes through that inner handler, then the parent gate's `onSkip` callback just runs `setOpen(false)`. Since `setOpen` is a controlled-prop change, Radix doesn't fire `onOpenChange`, so the gate's `markComplete()` (lines 311–319) never runs. Net effect: clicking Skip closes the dialog visually but leaves `completed_module_setups[key]` unset → re-prompts forever.

**Fix:** in `ModuleSetupDialog.onSkip`, always `await markComplete()` (drop the `if (!dismissible)` guard). Save & continue already calls `markComplete()` directly, so it works. The X / Esc / outside-click paths already mark complete via `ModuleSetupGate.onOpenChange`.

### Problem 2 — tour and setup modal stack on first visit

Pages like `Grocery.tsx`, `Meals.tsx`, `Tasks.tsx`, `Calendar.tsx`, `Habits.tsx`, `Index.tsx` render an `<OnboardingTour run={runOnboarding} ... />` *and* are wrapped in `<ModuleSetupGate module="…">`. Both fire on first visit — gate doesn't know the tour is showing.

**Fix:** add a `paused?: boolean` prop to `ModuleSetupGate`. When `paused=true`, render `{children}` only — don't render the dialog. Each page passes `paused={shouldShowTour && tourChecked}` (i.e. tour is queued to show or actively running). Once the user finishes / dismisses the tour, `markTourComplete()` flips `shouldShowTour` to false, the gate un-pauses, and the setup dialog appears.

To avoid editing every page's wrapper plumbing twice, expose the "tour active" signal via a tiny context the wrapper can read, OR just lift the wrapper inside the page component (where `shouldShowTour` is already in scope) and pass the prop directly. The lighter change: keep the existing `<PageWithGate>` wrappers but pass `paused` from outside via React Query — `ModuleSetupGate` reads `useFeatureTour(featureName)` for the matching feature.

Concrete approach (minimal intrusion):
- Map each `ModuleSetupKey` → `FeatureName` (e.g. `grocery_setup` → `grocery`, `meals_setup` → `meals`, `tasks_setup` → `tasks`, `calendar_setup` → `calendar`, `habits_setup` → `habits`, `finance_setup` → no tour today; treat as never paused).
- Inside `ModuleSetupGate`, call `useFeatureTour(matchingFeatureName)`. If `shouldShowTour || !tourChecked`, render only `{children}`.

This keeps page-level code untouched and handles the dashboard/Finance pages too.

### Problem 3 — X button advances queue instead of dismissing

In `src/components/onboarding/ModuleSetupQueue.tsx`:
```ts
onOpenChange={(o) => { if (!o) advance(); }}
```
This is the X / Esc / outside-click path. It calls `advance()` which moves to the next module in the queue. The user expects X to dismiss the entire flow.

**Fix:** when the user closes the dialog (X / Esc / outside), end the queue (`onAllDone()`) AND mark the current module complete so it doesn't re-appear next visit:
```ts
onOpenChange={(o) => {
  if (o) return;
  // Closing via X: mark current complete, end the queue.
  // markComplete is owned by the inner ModuleSetupDialog via its own
  // onOpenChange contract — we just need to stop the queue.
  onAllDone();
}}
```
The inner `ModuleSetupDialog.onSkip` change from Problem 1 ensures the current module also gets persisted. (The inner dialog's `onOpenChange` from X already handles its own `markComplete` because it sits inside `ModuleSetupGate`-style controllers — but in the queue the dialog is rendered without a gate, so we additionally call `useModuleSetup(current).markComplete()` from inside `ModuleSetupQueue` before `onAllDone()`.)

## Files to change

1. **`src/components/onboarding/ModuleSetupGate.tsx`**
   - In `ModuleSetupDialog`'s inner `onSkip` (around line 658), drop the `if (!dismissible)` and always `await markComplete()` before calling `onSkip?.()`. Also call `clearModuleSetupDraft(householdId, module)` so the saved partial answers don't linger.
   - In `ModuleSetupGate`, add `useFeatureTour` lookup using a `MODULE_TO_FEATURE_TOUR` map (defined locally or in `lib/moduleSetup.ts`). If the tour is unfinished, return `<>{children}</>` without the dialog.

2. **`src/components/onboarding/ModuleSetupQueue.tsx`**
   - Track current module's `markComplete` via `useModuleSetup(current)`.
   - Change `onOpenChange` to: if closing, `await markComplete().catch(noop); onAllDone();`.
   - Keep `onSkip` as-is (advances within the queue) so the "Skip for now" footer button still walks through modules one-by-one — that's the intended behavior; only the X dismisses the whole flow.

3. **`src/lib/moduleSetup.ts`** (small addition)
   - Export `MODULE_TO_FEATURE_TOUR: Partial<Record<ModuleSetupKey, FeatureName>>` mapping `meals_setup→meals`, `grocery_setup→grocery`, `tasks_setup→tasks`, `habits_setup→habits`, `calendar_setup→calendar`. `finance_setup` has no tour today → omit (treated as not paused).

No page files (`Grocery.tsx`, `Meals.tsx`, etc.) need to change — the tour-pausing logic lives inside the gate.
No DB migration is needed — `completed_module_setups` and `completed_tours` already exist.

## Verification

Manual on the test account:
1. Reset a tour/setup flag for the test household and reload Grocery → confirm only the welcome tour shows; finishing it then reveals the setup dialog (no stack).
2. Click **Skip for now** → reload Grocery → confirm the setup dialog does NOT reappear.
3. Click **Save & continue** on a different module → reload → confirm it does NOT reappear.
4. From Settings → enable two new products to trigger `ModuleSetupQueue`; click X on the first dialog → confirm the entire queue closes (no second module dialog appears) and neither module re-prompts on next page visit.
5. Re-run the existing Vitest suite: `bunx vitest run` to make sure `ModuleSetupGate.test.tsx` still passes (or update fixtures if the new prop changes default behavior).