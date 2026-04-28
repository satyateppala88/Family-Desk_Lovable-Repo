# Fix: Meal Preferences (and similar) dialogs not scrolling

## Problem

In Settings, the **Edit Dietary Preferences** dialog (and a few other settings dialogs) overflow the viewport on smaller screens — the content inside is not scrollable, so the bottom fields and Save button get cut off.

## Root cause

Radix UI's `ScrollArea` renders a Viewport with `h-full w-full`. For scrolling to actually engage, the ScrollArea's parent must give it a **fixed/flex height**, not just `max-height`.

Dialogs that use `className="flex-1 pr-4 -mr-4"` inside a flex-column DialogContent scroll correctly. Dialogs that use `className="max-h-[60vh] pr-4"` do **not** scroll — the viewport collapses to content height, content overflows the dialog, and the dialog itself gets clipped by the screen.

Affected dialogs (all use the broken `max-h-[60vh]` pattern):
- `src/components/settings/EditDietaryPreferencesDialog.tsx` (the one user reported)
- `src/components/settings/EditCookingPreferencesDialog.tsx`
- `src/components/settings/EditRoutinePreferencesDialog.tsx`
- `src/components/settings/EditBudgetPreferencesDialog.tsx`

## Fix

Adopt the same proven pattern used by `EditMealsPreferencesDialog`, `EditGroceryPreferencesDialog`, `EditHabitsTasksPreferencesDialog`, and `EditCalendarPreferencesDialog`:

1. Make `DialogContent` a bounded flex column:
   - Add `max-h-[90vh] flex flex-col` to the `DialogContent` className.
2. Let the ScrollArea fill the remaining space:
   - Replace `className="max-h-[60vh] pr-4"` on `<ScrollArea>` with `className="flex-1 pr-4 -mr-4 min-h-0"`.
3. Keep `DialogHeader` and `DialogFooter` as fixed (non-flex) siblings so only the middle area scrolls.

The `min-h-0` is important on flex children that contain a scroll container — without it, flexbox's default `min-height: auto` prevents the child from shrinking below its content size and scrolling never engages.

## Files to change

- `src/components/settings/EditDietaryPreferencesDialog.tsx`
- `src/components/settings/EditCookingPreferencesDialog.tsx`
- `src/components/settings/EditRoutinePreferencesDialog.tsx`
- `src/components/settings/EditBudgetPreferencesDialog.tsx`

## Verification

- Open Settings → Edit Dietary Preferences on a 947×754 viewport (current preview size) and on a smaller phone viewport. Confirm the inner form scrolls and Save/Cancel remain visible at the bottom.
- Spot-check the other three dialogs the same way.
- No backend, schema, or migration changes — purely a CSS/layout fix.
