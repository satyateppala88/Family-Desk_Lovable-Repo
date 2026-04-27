# Fix Module Onboarding Questionnaire Scroll

## Problem

The per-module setup dialog (`ModuleSetupDialog` in `src/components/onboarding/ModuleSetupGate.tsx`) does not scroll properly when the questionnaire is taller than the viewport.

Root causes:

1. **`DialogFooter` is rendered *inside* the `ScrollArea`** (via `FormShell` returning `<>{children}<DialogFooter/></>` which is mounted inside `<ScrollArea>`). This means:
   - The Save / Skip buttons scroll away with the content (bad UX), and
   - When combined with the next issue, scrolling appears broken because the inner content height is constrained oddly.

2. **`ScrollArea` height computation is fragile** here: `<DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">` + `<ScrollArea className="flex-1 pr-4 -mr-4">`. The Radix `ScrollArea` Viewport needs an explicit pixel/flex height to scroll. With `flex-1` inside a flex column it *should* work, but the global rule in `src/index.css`:
   ```css
   button, a, [role="button"], input, select, textarea { min-height: var(--touch-target, 44px); }
   ```
   applies a 44px min-height to the `ScrollAreaThumb`'s internal button-like element on some browsers, which doesn't break scrolling itself — but the real blocker is that the form's content + footer overflows the viewport region and the wheel events land on elements (radio/checkbox rows) whose container has no overflow set.

3. The full-page **`UserPreferencesOnboarding`** wrapper (`min-h-screen ... py-10 px-4`) is fine — page scrolls — but the **`ModuleSetupQueue`** dialog suffers the bug above immediately after Finish.

## Fix

### 1. `src/components/onboarding/ModuleSetupGate.tsx`

- Move `DialogFooter` **out of** the `ScrollArea` so the action buttons stay pinned at the bottom of the dialog and only the form body scrolls.
- Restructure `ModuleSetupDialog` layout:
  ```
  DialogContent (flex flex-col, max-h-[90vh])
    DialogHeader            ← fixed
    ScrollArea (flex-1 min-h-0)
      <ModuleSetupForm body only>   ← scrolls
    DialogFooter            ← fixed (Skip / Save & continue)
  ```
- Refactor `FormShell` to render children-only (no footer); lift the footer up into `ModuleSetupDialog`. Pass `onSave` / `onSkip` / `isSaving` down so the dialog can render the footer.
  - Each form (`MealsSetupForm`, `GrocerySetupForm`, `FinanceSetupForm`, `RoutineSetupForm`, `CalendarSetupForm`) currently calls `<FormShell onSave={() => onSubmit(data)} ...>`. Update them to instead expose their `onSave` payload to the parent. Cleanest approach: keep `FormShell` but make it render only the scrollable body (`<div className="space-y-5 py-4">{children}</div>`) and have it accept an optional ref/callback that publishes the save handler upward. Simpler alternative:
    - Change each `*SetupForm` to use `useImperativeHandle` via a forwarded ref OR
    - Easier: each form receives a `registerSave: (fn: () => void) => void` prop and calls it with its current save handler on render. Dialog stores it in state and wires it to the footer button.
  - Add `min-h-0` to the `ScrollArea` className so flex sizing computes correctly: `className="flex-1 min-h-0 pr-4 -mr-4"`.

### 2. Verify other onboarding scrolls

- `UserPreferencesOnboarding` (the multi-step setup before module queue): already uses `min-h-screen ... py-10` — page-level scroll works. No change needed.
- `OnboardingTour` / `OnboardingIntro`: confirm no `overflow-hidden` clamp; no change expected.

### 3. Add `ScrollToTop` (small global polish)

While we're touching navigation/scroll, add `src/components/ScrollToTop.tsx` and mount inside `<BrowserRouter>` in `src/App.tsx` so route changes always start at the top. (Useful since some long pages currently retain the previous scroll offset on navigation.)

## Files changed

- `src/components/onboarding/ModuleSetupGate.tsx` — refactor dialog layout; pin footer; ensure ScrollArea scrolls.
- `src/components/onboarding/UserPreferencesOnboarding.test.tsx` — only touch if test asserts old footer placement (will check during implementation).
- `src/App.tsx` — mount `<ScrollToTop />`.
- `src/components/ScrollToTop.tsx` — new, ~10 lines.

## Verification

- Open Module Setup dialog (Meals form is the tallest) on mobile viewport (375×812). Confirm:
  - Form body scrolls smoothly with mouse wheel and touch.
  - "Skip for now" and "Save & continue" remain visible at the bottom while scrolling.
  - Save still persists and advances to next module.
- Run existing Vitest suite (`UserPreferencesOnboarding.test.tsx`) — must still pass.
- Spot-check route changes (e.g. Dashboard → Settings) start at top after `ScrollToTop` is added.
