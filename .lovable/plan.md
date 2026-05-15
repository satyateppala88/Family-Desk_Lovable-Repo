# Bug-fix batch (BUG-FIX-01 … 07)

A few of the spec's prescriptions don't match what's already in this codebase. Calling those out up-front so we don't regress working systems:

- **Modals already use a shared sticky-footer wrapper** — `src/components/ui/BottomSheet.tsx` — used by Transaction, Subscription, AddCard, Savings, Budget, AddMeal, RecipeBrowser, ChallengePicker, etc. The footer is already `sticky bottom-0`, body is `flex-1 overflow-y-auto`, container is `max-h-[90dvh]` with flex column. So BUG-FIX-01 isn't a "shared pattern" rewrite — the affected dialogs are the ones that *don't* use BottomSheet (CreateEventDialog, CalendarEventDialog, SavingsGoalDialog use raw shadcn `Dialog`).
- **Setup completion is stored on `household_preferences`**, not `profiles.setup_completed_modules`. We have typed boolean columns (`finance_setup_complete`, `calendar_setup_complete`, …) plus a legacy `completed_module_setups` jsonb fallback, all driven by `useModuleSetup` + `ModuleSetupGate`. Adding the spec's `profiles.setup_completed_modules` column would create a third source of truth and re-introduce the very desync the typed columns were added to fix. I'll fix the actual dismiss/persistence bug inside the existing system instead.
- **`paid_by` already defaults to `user?.id`** in `TransactionDialog`. The visible "no selection" symptom is almost certainly the SavingsGoalDialog (which has no Paid by) or the inline Savings add (BUG-FIX-04). I'll re-verify and only patch where it's actually missing.

## What I'll change

### 1. BUG-FIX-01 — Sticky footer overlapping form (Calendar + SavingsGoal dialogs)
Convert the three raw-`Dialog` forms to the same flex+overflow pattern BottomSheet uses, so footer anchors instead of floating:
- `src/components/calendar/CreateEventDialog.tsx`
- `src/components/calendar/CalendarEventDialog.tsx`
- `src/components/finance/SavingsGoalDialog.tsx`

Pattern applied to each `DialogContent`:
```
className="flex flex-col max-h-[85dvh] p-0 gap-0"
  <DialogHeader className="px-6 pt-6 pb-2 shrink-0" />
  <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">{form fields}</div>
  <DialogFooter className="sticky bottom-0 bg-background border-t px-6 py-4 shrink-0
                           pb-[max(1rem,env(safe-area-inset-bottom))]">{buttons}</DialogFooter>
```
Spot-check `BudgetDialog`, `SubscriptionDialog`, `AddCardDialog`, `TransactionDialog` — they already use BottomSheet so are fine; verify scroll on a tall viewport before closing the bug.

### 2. BUG-FIX-02 — Setup modals reappearing
Inside the existing `ModuleSetupGate` / `ModuleSetupDialog` system (no new column):
- **Dismiss via X / Esc / outside click** must call `markComplete()` (writes the typed `*_setup_complete` boolean) before closing. Today the `onOpenChange` path in `ModuleSetupGate` only flips local state and relies on a `dismissAndComplete` inside the dialog — confirm that path actually fires on every exit (X, Esc, outside, Skip) and add the missing one(s).
- **Skip / Set up later** already calls `markComplete` + `clearModuleSetupDraft`; verify and unify into one helper so all four exit paths take the same write path.
- **Pre-render gate**: `ModuleSetupGate` already returns children-only while `isLoading` and when `!needsSetup`. Confirm `useHouseholdPreferences` doesn't briefly return `isLoading=false` with stale empty data after route change (the suspected cause of the reappearance). If it does, add a `placeholderData: keepPreviousData` or wait for `isFetched` before computing `needsSetup`.
- No DB migration needed; the typed columns and triggers exist.

### 3. BUG-FIX-03 — "Paid by" default
- Verify `TransactionDialog`: it's already `useState(initialData?.paid_by || user?.id || "")` and reset on open uses `user?.id`. Re-test with the test user; if the dropdown still shows blank, the cause is the `members` list arriving after first render — fix by syncing `paidBy` to `user.id` once `members` resolves and `paidBy` is empty.
- The "Savings form" referenced in the spec is the same dialog (Savings is a `type` toggle inside TransactionDialog), so the same fix covers it.
- No change to required/optional behaviour.

### 4. BUG-FIX-04 — Inline savings add must create a transaction (Option A)
In `src/pages/FinanceSavings.tsx::handleAddFunds`:
- Replace the direct `updateGoal({ current_amount: newAmount })` with a `useCreateFinanceTransaction` insert:
  ```
  type: 'savings', amount, savings_goal_id: goalId,
  category: 'sip' (existing savings category default — 'Bank Deposit' isn't in our enum),
  paid_by: user.id, description: `Contribution to ${goal.name}`,
  transaction_date: today, household_id
  ```
- Stop writing `saved_amount` / `current_amount`. Progress bar already prefers `linkedSum` via `effectiveAmount = Math.max(current_amount, linkedSum)` — switch it to use `linkedSum` only so the derived view is the single source of truth.
- Invalidate `['finance-savings-goals', householdId]`, `['finance-transactions', householdId]`, `['savings-contributions', householdId]`, `['finance-summary', householdId]` after success.

### 5. BUG-FIX-05 — Two days highlighted on calendar grid
In `src/components/calendar/CalendarGrid.tsx` the day-cell style condition is `(isToday(day) || isSameDay(day, selectedDate))` — that highlights *both* "today" AND the explicitly selected date. Fix:
- Selected style applies only when `isSameDay(day, selectedDate)`.
- "Today" gets a subtler ring (`ring-1 ring-primary/40`) so it stays distinguishable but isn't visually "selected".
- Apply to both grid views (lines ~96 and ~236).
- No memoisation involved here; the bug is the OR.

### 6. BUG-FIX-06 — Blank time silently becomes all-day
In `src/components/calendar/CreateEventDialog.tsx`:
- Keep the existing All-day `Switch`; ensure it renders above the Time field without scrolling on the standard sheet height.
- On submit when `!allDay && !time`: setLocalError, focus time input, do not call `onSave`. Inline message: *"Please enter a time, or toggle All day above."*
- Remove the silent `time || null` fallthrough that produced the all-day conversion.
- All-day ON → hide the time input (already does); All-day OFF → require time.

### 7. BUG-FIX-07 — Monthly Report defaults to last month
In `src/pages/FinanceReport.tsx`:
- Change `const defaultMonth = format(addMonths(startOfMonth(new Date()), -1), "yyyy-MM");` to `format(startOfMonth(new Date()), "yyyy-MM")`.
- Right-arrow `disabled={isCurrentOrFuture}` already correct; left arrow already subtracts one month.
- Header label is derived from state, so no flash.

## Out of scope
- Form validation rules, submission payloads, modal open/close behaviour beyond what each bug requires.
- Migrating other already-working modals.
- Adding the spec's `profiles.setup_completed_modules` column (would conflict with the existing typed-column system).

## Test pass after edits
- Login as `testuser@dealcompass.test` → open each fixed dialog on 892×754 viewport, scroll to bottom, confirm footer sticks and Category/All-day are reachable.
- Visit `/finance` and `/calendar` twice in a row → setup modals must NOT reappear after dismissal via any exit path.
- Add a savings contribution from the goal card → confirm a `finance_transactions` row appears and the Savings Timeline updates.
- Tap two different dates on `/calendar` → only the latest is highlighted.
- Submit Create Event with blank time → inline error blocks save.
- Open `/finance/report` → header reads "May 2026".
