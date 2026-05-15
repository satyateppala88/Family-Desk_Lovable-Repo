## Goal

Make habit check/uncheck feel instant and prevent double-taps while the upsert is in flight.

## Files

- `src/hooks/useHabits.ts` — `logHabit` mutation
- `src/components/habits/HabitCard.tsx` — completion ring button
- `src/pages/Habits.tsx` — pass pending state into the card

## Changes

### 1. `logHabit` (useHabits.ts, ~lines 218–276)

Keep `mutationFn` as-is (it upserts the log and then updates streak + score). Add optimistic handling against the actual today's-logs query key used by the page.

- The query key is `["habit-logs-today", householdId, targetUserId, today]` (line 81). Cache shape is `HabitLog[]`.
- Add `onMutate({ habitId, completed, actualValue })`:
  - `await queryClient.cancelQueries({ queryKey: ["habit-logs-today", householdId, targetUserId, today] })`
  - Snapshot current data via `getQueryData`.
  - `setQueryData` with a new array:
    - If a log for `habit_id === habitId` exists, map it to `{ ...log, completed, actual_value: actualValue ?? log.actual_value }`.
    - Otherwise prepend a synthetic optimistic entry: `{ id: \`optimistic-${Date.now()}\`, habit_id: habitId, user_id: targetUserId, log_date: today, completed, actual_value: actualValue ?? null, notes: null, logged_at: new Date().toISOString() }` (cast as HabitLog).
  - Return `{ previous, queryKey }` for rollback.
- Replace `onSuccess` invalidations: drop `["habit-logs-today"]` (cache is already correct). Keep `["habit-streaks"]`, `["household-habit-stats"]`, `["habit-leaderboard"]`, `["habit-scores"]` since those are server-recomputed.
- Replace `onError(_err, _vars, ctx)`:
  - `queryClient.setQueryData(ctx.queryKey, ctx.previous)`
  - Toast: title "Could not save habit", description = error.message, variant destructive.

No change to `updateStreak` / `updateScore` helpers, no DB or schema changes.

### 2. `HabitCard.tsx`

- Add optional prop `isPending?: boolean` to `HabitCardProps` and component signature (default `false`).
- On the completion-ring `<button>` (line 87) and the card's `onClick` (line 77 — only set when `!hasTarget`):
  - `disabled={isPending}` on the button.
  - Append classes `isPending && "opacity-50 cursor-not-allowed pointer-events-none"` to both the button and the Card so the whole tap target is locked.
- For the target/+/− controls (lines 147 area), also disable the +/− `Button`s when `isPending` to avoid bursts.

### 3. `Habits.tsx`

- Where `<HabitCard ... onToggle={handleToggleHabit} />` is rendered (line 289), pass `isPending={logHabit.isPending}`.

## Result

- Tap flips the ring instantly; no waiting on the server round-trip.
- The ring/card is visually disabled and unclickable until the mutation settles, blocking double submissions.
- On failure the optimistic flip rolls back and a toast surfaces the real error.
- Streaks/leaderboard/scores still refresh after success; today's-logs query is no longer invalidated, eliminating the post-tap flicker.
