## Findings

I checked the three asks against current code and the DB. Two of the three are **already implemented exactly as specified** in earlier sessions; the third needs only a small polish.

### 1. `logHabit` upsert `onConflict` — already correct

`src/hooks/useHabits.ts:243` already reads:
```ts
onConflict: "habit_id,log_date,user_id",
```
No change needed.

### 2. `updateScore` stale-closure fix — already correct

`src/hooks/useHabits.ts:344-356` already does the live DB count instead of the stale-closure `todaysLogs?.filter(...)`:
```ts
const { count: completedTodayCount } = await supabase
  .from("habit_logs")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId)
  .eq("log_date", today)
  .eq("completed", true);

const totalToday = todaysHabits.length;
const completedToday = completedTodayCount ?? 0;
if (completedToday >= totalToday && totalToday > 0) {
  dailyScore += ALL_HABITS_BONUS;
}
```
No change needed.

### 3. Leaderboard / "Assigned to" "Unknown" labels

The profile join is already in place everywhere it matters:
- `src/hooks/useHabitLeaderboard.ts` — joins `profiles` (id, display_name, avatar_url) for all household members.
- `src/hooks/useHouseholdMembers.ts` — same join; consumed by `TaskCompletionSheet.tsx` which renders `m.displayName` (not raw user_id) for the "Assigned to" chips.
- `src/hooks/useHouseholdHabitStats.ts` — same join, falls back to `"Member"`.

DB check confirmed there are **0 profiles with NULL/empty `display_name`**, and the `profiles` RLS policy already allows household co-members to read each other's profile rows. So the literal string `"Unknown"` should virtually never render in production — but it remains as a defensive fallback in two hooks.

**Only change needed:** harmonize the fallback string from `"Unknown"` to `"Member"` in `useHabitLeaderboard.ts` and `useHouseholdMembers.ts`, matching the friendlier convention already used in `useHouseholdHabitStats.ts`. This guarantees that even if a profile row is ever missing/unreadable, the UI says "Member" instead of "Unknown" in the leaderboard and the task "Assigned to" chips.

## Files to change

1. `src/hooks/useHabitLeaderboard.ts` — line 80: `"Unknown"` → `"Member"`.
2. `src/hooks/useHouseholdMembers.ts` — line 42: `"Unknown"` → `"Member"`.

No DB migration, no mutation logic changes, no schema changes.

## Verification

- `rg -n "Unknown" src/hooks/useHabit*.ts src/hooks/useHousehold*.ts` returns no hits after the edit.
- Sign in as the test account (`testuser@dealcompass.test`), open Habits → Leaderboard, and Taskmaster → New task → confirm member names render as `display_name` (no "Unknown" / no raw UUIDs).