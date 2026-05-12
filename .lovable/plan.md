## Plan: Update `logHabit` upsert onConflict key

In `src/hooks/useHabits.ts` line 234, change the upsert's `onConflict` from `"habit_id,log_date"` to `"habit_id,log_date,user_id"`.

This matches the new 3-column unique index already applied to `habit_logs`, so household members logging the same shared habit on the same day no longer overwrite each other.

No other code changes.
