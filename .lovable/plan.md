## Bug

In `useHouseholdHabitStats` (the hook powering the per-member counters on the Habits page), a habit is attributed to a member purely by **creator**:

```ts
const memberHabits = habits.filter(h => h.user_id === userId); // line 104
```

This ignores `assignment_type`. So Rajashree's "Swimming" habit (assignment_type=`multiple`, assignee=Satya) is counted under **Rajashree's** column even though she isn't an assignee, while Satya — the actual assignee — gets nothing for it.

`useHabits` already handles this correctly for "My Habits" (personal → creator only; household → everyone; multiple → only listed assignees). The household-stats hook needs the same rule.

## Fix

Update `src/hooks/useHouseholdHabitStats.ts`:

1. Fetch `habit_assignees` for the household's habits alongside the existing queries.
2. Build a per-member habit list using:
   - `personal` → `h.user_id === userId`
   - `household` → every member
   - `multiple` → `userId ∈ habit_assignees(habit_id)`
3. Use that filtered list for **both** `memberPlannedToday` and the weekly rate denominator (`memberHabits.length * 7`).
4. Today/weekly completion counts already come from `habit_logs.user_id` so they're correct — but restrict them to logs whose `habit_id` is in the member's filtered list, so a stray log can't inflate a member's number for a habit they're no longer assigned to.

Household-wide `totalHabits`, `plannedToday`, `completedToday`, `longestStreak` stay as-is (they aggregate across the household).

No schema changes. No UI changes. Only `useHouseholdHabitStats.ts` is touched.

## Expected result for Rajashree's case

- "Swimming" disappears from Rajashree's counter (she's not an assignee).
- It shows under Satya's counter (planned today if today matches the recurrence days).
- Household totals unchanged.