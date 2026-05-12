## Replace stale-closure check in `updateScore`

In `src/hooks/useHabits.ts` (lines 344–349), replace the cached `todaysLogs` count with a live DB query so the all-habits bonus uses fresh data.

```ts
// Check if all habits completed today for bonus
const { count: completedTodayCount } = await supabase
  .from('habit_logs')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('log_date', today)
  .eq('completed', true);

const totalToday = todaysHabits.length;
const completedToday = completedTodayCount ?? 0;
if (completedToday >= totalToday && totalToday > 0) {
  dailyScore += ALL_HABITS_BONUS;
}
```

No other changes.