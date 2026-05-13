## Root cause

The shared `DialogContent` (`src/components/ui/dialog.tsx`) sets no max-height and no scroll. Long forms (Taskmaster create-task, Add Pantry Item, all Settings dialogs, etc.) overflow the viewport and the footer disappears below the fold. The `SheetContent` and `DrawerContent` primitives have the same issue when their consumers render long content with a footer at the end.

Rather than patch every consumer one by one (30+ files), the right fix is at the primitive layer plus a thin convention for the body wrapper.

## Fix — primitives (3 files)

### 1. `src/components/ui/dialog.tsx`
- `DialogContent`: add `flex max-h-[90dvh] flex-col` (keep existing `gap-4`, `p-6`, transforms). This makes the content a vertical flex column constrained to 90% of viewport height.
- `DialogHeader`: add `flex-shrink-0`.
- `DialogFooter`: add `mt-auto flex-shrink-0 sticky bottom-0 z-10 bg-background -mx-6 -mb-6 px-6 py-4 border-t border-border` so it pins to the bottom of `DialogContent` while content scrolls behind it. Keep existing `flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`.

### 2. `src/components/ui/sheet.tsx`
- `SheetContent` (side="right"/"left"): add `flex flex-col` and ensure `h-full`. Already full-height, just needs flex column.
- `SheetHeader`: add `flex-shrink-0`.
- `SheetFooter`: add `mt-auto flex-shrink-0 sticky bottom-0 z-10 bg-background border-t border-border px-6 py-4` (mirroring dialog).

### 3. `src/components/ui/drawer.tsx`
- `DrawerContent`: add `max-h-[90dvh] flex flex-col`.
- `DrawerHeader`/`DrawerFooter`: same `flex-shrink-0` + sticky/border treatment on footer.

## Fix — body scroll wrapper (per-dialog, mechanical)

For the primitive fix to actually scroll, the body that sits between `<DialogHeader>` and `<DialogFooter>` needs `flex-1 overflow-y-auto -mx-6 px-6` (negative margin keeps fields edge-to-edge, padding keeps inner spacing). In all the listed dialogs the body is already a single `<div className="grid gap-4 py-4">` (or similar) — we just append the scroll classes. No structural changes.

Files to update (body wrapper className only — no logic changes):

Taskmaster + grocery (called out by user):
- `src/components/taskmaster/TaskmasterTaskDialog.tsx`
- `src/components/taskmaster/ProjectDialog.tsx`
- `src/components/taskmaster/CalendarTaskScanDialog.tsx`
- `src/components/grocery/AddPantryItemDialog.tsx`
- `src/components/grocery/CreateShoppingListDialog.tsx`
- `src/components/grocery/ScanBillDialog.tsx`
- `src/components/grocery/BillReviewDialog.tsx`
- `src/components/grocery/AIPantryImportDialog.tsx`
- `src/components/grocery/QuickAddChecklist.tsx` (if it uses Dialog)

Other form Sheets/Dialogs in the app:
- `src/components/tasks/TaskDialog.tsx`
- `src/components/meals/RecipeRatingDialog.tsx`
- `src/components/meals/MarkAsCookedDialog.tsx`
- `src/components/finance/TransactionDialog.tsx`
- `src/components/finance/BudgetDialog.tsx`
- `src/components/finance/SubscriptionDialog.tsx`
- `src/components/finance/AddCardDialog.tsx`
- `src/components/finance/SavingsGoalDialog.tsx`
- `src/components/finance/CategorySelect.tsx`
- `src/components/habits/HabitCreateDialog.tsx`
- `src/components/household/InviteMemberDialog.tsx`
- `src/components/calendar/CalendarEventDialog.tsx`
- `src/components/calendar/ConnectCalendarDialog.tsx`
- `src/components/permissions/PermissionPrimerDialog.tsx`
- `src/components/onboarding/ModuleSetupGate.tsx`
- `src/components/settings/Edit*PreferencesDialog.tsx` (9 files)
- `src/components/taskmaster/TaskCompletionSheet.tsx` (Sheet)
- `src/components/meals/RecipeBrowserSheet.tsx` (Sheet)
- `src/components/avatar/AvatarSourceSheet.tsx` (Sheet)

For each, the change is one className edit on the body wrapper between header and footer:
```diff
- <div className="grid gap-4 py-4">
+ <div className="flex-1 overflow-y-auto -mx-6 px-6 grid gap-4 py-4">
```

## What is NOT touched
- `ConfirmDialog`, `AlertDialog`, `RecipeDetailDialog` (no form footer / already small or already scrollable) — only review for visual regressions; no code changes unless they break.
- `AIChatWidget` Sheet (custom layout, already manages its own scroll).
- `CalendarSidebar` / `CalendarHeader` Sheets (navigation drawers, not forms).
- Sidebar primitive (`src/components/ui/sidebar.tsx`) — unrelated nav.
- No changes to data fetching, validation, props, or component APIs.

## Verification
1. Open Taskmaster → type task → "Complete task details" — footer pinned, content scrolls.
2. Open Grocery → Add Pantry Item — same.
3. Spot-check a tall settings dialog (e.g. Edit Dietary Preferences) at mobile viewport (375×667) — footer pinned.
4. Spot-check a short dialog (Mark as Cooked) — looks identical to before (no oversized whitespace, since `mt-auto` only pushes when content is short, and `max-h-[90dvh]` is a ceiling not a floor).
5. Smoke test desktop (1280) and mobile (375) viewports.