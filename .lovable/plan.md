# Fix cut-off action buttons in all sheets, drawers, and dialogs

## Root cause

Two separate problems:

1. **Primitive components** — `DialogFooter`, `SheetFooter`, `DrawerFooter` are already `sticky bottom-0` but lack `padding-bottom: max(16px, env(safe-area-inset-bottom))`. On mobile devices with a home indicator (iOS) or in PWAs/Capacitor, the bottom row gets clipped behind the safe-area inset. `DialogContent` also uses `grid` + `overflow-y-auto`, which makes sticky positioning brittle inside a scrollable grid.
2. **17 dialogs use an ad-hoc `<div className="flex gap-2 justify-end">`** for their button row instead of `<DialogFooter>`, so they get no sticky behavior at all and their buttons scroll off-screen.

## Fix — Part A: harden the three primitives

### `src/components/ui/dialog.tsx`
- `DialogContent`: switch from `grid` to `flex flex-col`. Replace `overflow-y-auto` with `overflow-hidden` on the outer container so the footer can be sticky without competing scrollers.
- Wrap `{children}` in an inner `<div className="flex-1 overflow-y-auto -mx-6 px-6">` so the body scrolls and the footer remains pinned.
- Actually simpler and less invasive: keep `grid` + `overflow-y-auto` on `DialogContent`, but extend `DialogFooter` with `pb-[max(1rem,env(safe-area-inset-bottom))]`. Sticky already works for grid scroll containers in current Chromium/WebKit.

I will go with the simpler approach: only patch `DialogFooter` to add safe-area padding. No layout restructure — minimises regression risk on the dozens of existing dialogs.

### `src/components/ui/sheet.tsx`
- `SheetContent` already has `flex flex-col overflow-y-auto`. Extend `SheetFooter` className with `pb-[max(1rem,env(safe-area-inset-bottom))]`.

### `src/components/ui/drawer.tsx`
- Extend `DrawerFooter` className with `pb-[max(1rem,env(safe-area-inset-bottom))]`.

## Fix — Part B: refactor 17 dialogs to use `DialogFooter`

Each of these files currently ends its form with a bare `<div className="flex … justify-end">…buttons…</div>`. Replace that div with `<DialogFooter>…buttons…</DialogFooter>` (and add `DialogFooter` to the existing `@/components/ui/dialog` import). No logic, validation, or mutation calls touched.

Files:

```text
src/components/grocery/AddPantryItemDialog.tsx
src/components/grocery/AIPantryImportDialog.tsx
src/components/grocery/CreateShoppingListDialog.tsx
src/components/grocery/ScanBillDialog.tsx
src/components/grocery/QuickAddChecklist.tsx
src/components/grocery/BillReviewDialog.tsx
src/components/finance/TransactionDialog.tsx
src/components/finance/SubscriptionDialog.tsx
src/components/finance/BudgetDialog.tsx
src/components/finance/SavingsGoalDialog.tsx
src/components/finance/AddCardDialog.tsx
src/components/habits/HabitCreateDialog.tsx
src/components/calendar/CreateEventDialog.tsx
src/components/calendar/CalendarEventDialog.tsx
src/components/calendar/ConnectCalendarDialog.tsx
src/components/meals/AddIngredientsDialog.tsx
src/components/meals/MarkAsCookedDialog.tsx
```

The Taskmaster task creation dialog (`TaskmasterTaskDialog.tsx`) and Add Pantry Item (`AddPantryItemDialog.tsx`) — the two cases the user explicitly called out — are both fixed by this combined Part A + Part B change.

## Out of scope

- No business-logic changes to any dialog.
- No Sheet refactors needed in product code: every `Sheet*` consumer (`AiSuggestSheet`, `RecipeBrowserSheet`, `MoreSheet`, `TemplatePreviewSheet`, `TaskCompletionSheet`, `AvatarSourceSheet`, `ChallengePickerSheet`, `PantrySettingsSheet`, `AddMealSheet`) either has no footer or already uses a sticky footer — the primitive patch is sufficient.
- `DialogContent` layout (`grid` vs `flex`) left as-is to avoid touching dozens of existing dialogs that depend on the grid `gap-4` spacing.

## Verification

After the patch:
1. TypeScript compiles cleanly.
2. Open `/taskmaster` and `/grocery` on a 390×754 viewport, open task creation and Add Pantry Item, confirm Save/Cancel buttons stay visible while scrolling the form.
