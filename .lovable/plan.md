## Household habits: one check = whole family done

When any member ticks off a habit whose `assignment_type = 'household'`, every member should:
- get the completed log for today,
- have their streak on that habit advance,
- earn the +10 points and any streak bonuses,
- see updated stats / leaderboard immediately.

Untick is symmetric: it removes today's log + reverses the score for everyone.

`'multiple'` and `'personal'` habits keep today's per-user behavior. Only `'household'` fans out.

---

### Why a DB function (not pure client)

`habit_logs` RLS allows INSERT/UPDATE only where `user_id = auth.uid()`. A member can't write rows on behalf of other members from the client. So we need a `SECURITY DEFINER` Postgres function that does the fan-out atomically and runs its own authorization checks.

### Migration (single function, no schema changes)

`public.log_household_habit(_habit_id uuid, _completed boolean, _actual_value numeric default null)`:

1. Resolve `_household_id` and `assignment_type` from `habits` where `id = _habit_id`. Raise if not found.
2. Require `assignment_type = 'household'`. Raise otherwise (client should only call it for household habits).
3. Require `is_household_member(auth.uid(), _household_id)`. Raise otherwise.
4. For every `user_id` in `household_members` where `household_id = _household_id`:
   - Upsert `habit_logs (habit_id, user_id, log_date=today, completed, actual_value, logged_at=now())` on conflict `(habit_id, log_date, user_id)`.
   - Recompute `habit_streaks` for that `(habit_id, user_id)`:
     - If `_completed = true`: if last_completed_date = yesterday → current+1; if = today → unchanged; else → 1. Update `longest_streak = greatest(...)`.
     - If `_completed = false` and a log already existed as completed today: leave streak alone (we don't punish unticks within the same day) — matches existing client logic.
   - Upsert `habit_scores` for today by delta:
     - On transition `false → true`: add +10 plus tier bonus (3d=+5, 7d=+15, 30d=+50). Skip the "all habits bonus" — that's still computed per-user in the client path and getting it right across members is fragile; keep the simpler model.
     - On transition `true → false`: subtract what we previously added (read existing log to know the prior state).
5. Returns nothing.

`SECURITY DEFINER`, `SET search_path = public`, grant `EXECUTE` to `authenticated`.

### Client changes (`src/hooks/useHabits.ts`)

In `logHabit.mutationFn`:

```ts
const habit = (habits ?? []).find(h => h.id === habitId);
if (habit?.assignment_type === 'household') {
  const { error } = await supabase.rpc('log_household_habit', {
    _habit_id: habitId,
    _completed: completed,
    _actual_value: actualValue ?? null,
  });
  if (error) throw error;
  return null;
}
// existing personal/multiple path unchanged
```

`onSuccess` invalidates: `habit-logs-today` (all keys), `habit-streaks`, `household-habit-stats`, `habit-leaderboard`, `habit-scores`. The existing realtime subscription on `habit_logs` (no filter) in `Habits.tsx` already broadcasts changes to other members' sessions, so cross-device sync works without extra wiring.

Optimistic update for household habits: leave the existing per-user optimistic cache write — the user who tapped sees instant feedback; the server fan-out triggers realtime invalidation for everyone else within ~1s.

### Files touched

- New migration: `log_household_habit` SECURITY DEFINER function + grant.
- `src/hooks/useHabits.ts` — branch on `assignment_type === 'household'` in `logHabit.mutationFn` and broaden `onSuccess` invalidations.

No UI changes. No type changes.

### Out of scope

- "All habits done today" bonus for household habits — kept as per-user only (current behavior preserved).
- Notifications when a household habit is completed by someone else — can add later as a `dispatch_push` call inside the function if desired.
