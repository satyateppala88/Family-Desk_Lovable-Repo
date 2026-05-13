## Goal

Three Habits-module fixes:
1. Always-visible "+ Add Habit" CTA on the **Me** tab.
2. Joining/starting a Family Challenge auto-creates a linked habit for that user; marking the challenge "Done today" also logs the linked habit.
3. AI Coach Insight stops showing congratulatory copy when there's nothing to congratulate.

## Fix 1 — "+ Add Habit" CTA on the Me tab

`src/pages/Habits.tsx` already controls the create dialog (`createDialogOpen`) but never renders a trigger because `HabitCreateDialog` only renders its built-in button when uncontrolled. Add an explicit, always-visible CTA in the Me tab.

- Add a full-width primary button **directly under the Today's Progress card** (line ~239), label `+ Add Habit`, that calls `setCreateDialogOpen(true)`. This keeps it visible whether `todaysHabits` is empty or populated and sits above the habit list / empty state.
- No FAB (the global sparkle FAB stays untouched and the design system already prefers persistent inline CTAs).

## Fix 2 — Challenge ↔ Habit sync

### Schema (one migration)
Add nullable link columns so an auto-created habit can be traced back to its challenge:
- `habits.challenge_id uuid` (nullable, no FK to keep deletes flexible) + unique partial index on `(challenge_id, user_id) WHERE challenge_id IS NOT NULL` to prevent duplicates.

No data backfill needed.

### `src/hooks/useChallenges.ts`
After a successful `startChallenge` or `joinChallenge`, also create the linked habit for the current user (idempotent):
1. Look up `habits` where `challenge_id = challengeId AND user_id = auth.uid()` — if a row exists, skip.
2. Otherwise insert into `habits`:
   - `name` = challenge `name` (e.g. "Walk Together")
   - `household_id`, `user_id`, `assignment_type = 'personal'`, `frequency_type = 'daily'`, `frequency_days = []`, `is_active = true`, `challenge_id` set.
3. Also insert the matching `habit_assignees` row (`habit_id`, `user_id`) — `useHabits.todaysHabits` filters via assignees, so without this the habit won't appear in the user's list.

In `markDone` mutation:
- After inserting the `challenge_logs` row, look up the linked habit (`habits.challenge_id = challengeId AND user_id = auth.uid()`).
- If found, upsert a `habit_logs` row for `today` with `completed = true` (mirroring the existing `logHabit` mutation in `useHabits.ts`). Reuse the same shape so `useHouseholdHabitStats` and `todaysHabits` recompute identically.
- Invalidate `["habits", householdId]`, `["habit-logs-today"]`, `["household-habit-stats"]`, `["habit-leaderboard"]`, `["habit-scores"]` alongside the existing `["challenges", householdId]` invalidation.

This makes the linked habit appear on the Me list, count toward Today's Progress, and update the household summary cards.

We do **not** mirror in the reverse direction (habit → challenge); spec only requires challenge → habit.

## Fix 3 — Sober AI Coach copy

`src/pages/Habits.tsx` shows two `HabitCoachInsight` cards.

### Me tab
The Me-tab insight (line ~240) already only renders when `0 < completedCount < totalCount`, so it's safe. No change needed beyond Fix 3 below for the household tab — but the spec covers the Me-tab too. Add a single guard before the existing condition:
- If `totalCount === 0` OR `completedCount === 0` OR household age < 3 days → render a neutral insight: `"Add your first habit to start tracking your household's daily routine."`
- Else keep the existing positive copy when partial progress exists.

### Household tab
The Household-tab insight (line ~322) currently renders any time `memberStats.length > 0` with the "building great consistency!" copy. Replace that condition with the same three-part guard: when total habits across the household is 0, today's completions are 0, or household age < 3 days, show the neutral prompt instead.

### Household age source
Extend `useHousehold` to also return `householdCreatedAt` (already on `households.created_at`, just add it to the existing `select` and pass through). Compute `householdAgeDays = differenceInCalendarDays(today, new Date(householdCreatedAt))` in `Habits.tsx`.

The dismiss (×) behaviour on `HabitCoachInsight` is unchanged — still passes the same `onDismiss` no-op currently in place; the component itself isn't touched.

## Files touched

- `supabase/migrations/<new>.sql` — add `habits.challenge_id` + unique partial index.
- `src/hooks/useHousehold.ts` — surface `householdCreatedAt`.
- `src/hooks/useChallenges.ts` — auto-create linked habit on start/join; mirror completion in `markDone`; expanded query invalidations.
- `src/pages/Habits.tsx` — render `+ Add Habit` button under Today's Progress; guard both `HabitCoachInsight` cards with the new neutral-copy rule.

## Out of scope
- Bidirectional habit→challenge sync.
- Visual restyle of the AI Coach card or the dismiss interaction.
- Backfill of habits for already-joined challenges (only future joins create the link).
- Any change to the challenges tab UI itself.
