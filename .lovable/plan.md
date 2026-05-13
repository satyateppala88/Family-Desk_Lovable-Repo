## Goal

Form modals must always show action buttons pinned at the bottom, with the form body scrolling independently when content overflows the viewport. Currently, `DialogContent` uses `grid` + page-level `overflow-y-auto` and `DialogFooter` uses `sticky` with negative margins, which on tall forms (Create Task, Create Habit, Create Event) lets the footer drift mid-scroll on iOS Safari and short viewports.

## Approach

Introduce the prescribed flex column structure into the shared primitives, then wrap form bodies in a new `DialogBody` slot. BottomSheet-based modals (Create Habit, Create Event) already follow this structure — their footer prop renders inside a sticky `shrink-0` row, so they only need verification, not refactoring.

## Changes

### 1. `src/components/ui/dialog.tsx` (primitive refactor)

- `DialogContent`: replace base classes
  - From: `grid w-full max-w-lg max-h-[90dvh] overflow-y-auto ... gap-4 ... p-6`
  - To:   `flex flex-col w-full max-w-lg max-h-[90dvh] overflow-hidden ... p-0`
- `DialogHeader`: add `shrink-0 px-6 pt-6 pb-2`
- New export `DialogBody`: `flex-1 min-h-0 overflow-y-auto px-6 pb-4` (consumers place form fields here)
- `DialogFooter`: replace current sticky/negative-margin classes with `shrink-0 flex flex-col-reverse gap-2 border-t border-border bg-background px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-2`
- Move the Radix `Close` (X) button position from `right-4 top-4` to keep working with new padding (no functional change).

### 2. `src/components/ui/sheet.tsx` (mirror the primitive refactor)

- `SheetContent`: keep `flex flex-col` but remove `overflow-y-auto` and `p-6`; set `p-0 overflow-hidden`
- `SheetHeader`: `shrink-0 px-6 pt-6 pb-2`
- New export `SheetBody`: `flex-1 min-h-0 overflow-y-auto px-6 pb-4`
- `SheetFooter`: same footer treatment as `DialogFooter`

### 3. Form modals — wrap content in the new `DialogBody`

For each, move the existing form fields (everything between `DialogHeader` and `DialogFooter`) inside `<DialogBody>`. No field/validation/submit logic changes.

- `src/components/taskmaster/TaskmasterTaskDialog.tsx` (Create / Edit Task)
- `src/components/tasks/TaskDialog.tsx`
- `src/components/tasks/TaskForm.tsx`
- `src/components/calendar/CalendarEventDialog.tsx` (Create Event — Dialog variant)
- `src/components/taskmaster/ProjectDialog.tsx`
- `src/components/taskmaster/CalendarTaskScanDialog.tsx`
- `src/components/meals/AddIngredientsDialog.tsx`
- `src/components/meals/MarkAsCookedDialog.tsx`
- `src/components/meals/RecipeRatingDialog.tsx`
- `src/components/grocery/ScanBillDialog.tsx`
- `src/components/grocery/QuickAddChecklist.tsx`
- `src/components/grocery/AIPantryImportDialog.tsx`
- `src/components/grocery/BillReviewDialog.tsx`
- `src/components/finance/CategorySelect.tsx`
- `src/components/household/FamilyMembersSection.tsx` (invite/edit dialogs)
- `src/components/calendar/ConnectCalendarDialog.tsx`
- `src/pages/FinanceBudgetCategories.tsx` (in-page form dialog)
- `src/pages/HouseholdProductSettings.tsx` (form dialog)
- All `src/components/settings/Edit*Dialog.tsx` files (preferences edit dialogs — long forms, highest risk)

### 4. BottomSheet modals — verify only

- `src/components/habits/HabitCreateDialog.tsx` and `src/components/calendar/CreateEventDialog.tsx` already pass action buttons via the `footer` prop, which the BottomSheet renders in a `shrink-0` row below the `flex-1 overflow-y-auto` body. No structural change needed; spot-check at 667px height.

### 5. Out of scope (intentionally untouched)

- `confirm-dialog.tsx`, `alert-dialog.tsx`, `command.tsx`, `PermissionPrimerDialog`, `PermissionsTutorial`, `RecipeDetailDialog`, `InstallAppButton`, `ModuleSetupGate`, `CalendarHeader`, `CalendarSidebar`, `AdminAccessRequests` — these are confirmations, command palettes, full-screen flows, or read-only detail sheets, not form-with-footer modals.

## Verification

1. Build passes (typecheck).
2. Open Create Task, Create Habit, Create Event at viewport 375x667 — confirm footer pinned, body scrolls, all fields reachable.
3. Open one settings edit dialog (longest forms) at the same viewport — confirm same behaviour.
4. Open a confirm dialog — confirm look unchanged.

## Technical notes

- Adding `min-h-0` to the scrollable body is required so flex children can shrink below their intrinsic content height inside a bounded `max-h` parent.
- Padding moves from `DialogContent` onto each slot (`Header` / `Body` / `Footer`) so the scrollable region's scrollbar sits flush to the modal edge instead of inside a padded box.
- `DialogBody` is additive — dialogs that don't adopt it keep working (their content simply renders unpadded inside the flex column; only the listed form modals are migrated in this pass).
