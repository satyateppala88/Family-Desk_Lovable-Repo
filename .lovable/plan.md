## FIX-10 — Realtime channel hygiene + cache invalidation

### Audit results

**Realtime subscriptions (3 files total):**

1. `src/components/realtime/HouseholdRealtimeProvider.tsx` — already correct: deterministic name `household-${householdId}`, single channel multiplexing every shared table, cleanup via `removeChannel`, stable deps `[user?.id, householdId, queryClient]`. **No changes.**
2. `src/hooks/useRealtimeSubscription.ts` — already correct: deterministic name `realtime-${householdId}-${sortedTables}`, cleanup, self-write suppression in place. **No changes.**
3. `src/components/settings/NotificationPreferencesSection.tsx` — **bug**: uses fixed name `"profile-changes"` with no user/household scope; if remounted (HMR, dialog reopen) Supabase will reject the duplicate topic. Also subscribes to *every* profile UPDATE in the schema rather than the current user's row.

**Mutations missing invalidations** (write-author path; the realtime echo is suppressed for the writer, so onSuccess is the *only* refetch trigger for them):

- `useTasks` create/update/delete → invalidates only `["tasks", householdId]`. Missing: `["taskmaster-tasks", householdId]`, `["daily-plan"]`, `["dashboard-stats", householdId]`.
- `useHabits` logHabit → already invalidates streaks, leaderboard, scores. Verify it also hits `["habits", householdId]` (it does for create/delete; logging should add `["household-habit-stats"]` if missing — confirm during edit).
- `useFinance.useUpsertBudget` already invalidates budgets/annual/dashboard. Verify transaction mutations invalidate `finance-monthly-summary` + `finance-dashboard` + savings goals.
- Calendar event mutations (`useManualCalendarEvents`) — already invalidate `calendar-events`, `today-events`, `calendar-events-today`. **OK.**
- Grocery (`usePantryItems`) — already invalidates `pantry-items` + `pantry-stats`. Add `["dashboard-stats", householdId]` for parity with realtime map.
- Member-related: `HouseholdMembers.tsx` invalidates `["household-members"]` only. Add `["household-member-emails"]` and `["household"]`.

The QueryClient itself (`src/lib/query-client.ts`) uses `staleTime: 5 minutes`. Spec wants 30s with `refetchOnMount` + `refetchOnWindowFocus`.

### Changes

**1. `src/lib/query-client.ts` — tune defaults (do not touch persistence)**

```ts
defaultOptions: {
  queries: {
    staleTime: 30 * 1000,
    gcTime: MAX_AGE_MS,            // keep 7d so persister still has data
    refetchOnReconnect: true,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  },
},
```

Persister stays — `gcTime` of 7d is independent of `staleTime`. We do not change the persister config.

**2. `src/App.tsx` — wipe orphan channels on app mount**

Inside the `App` component add a small effect-only child or convert `App` to use `useEffect`:

```ts
useEffect(() => {
  supabase.removeAllChannels();
}, []);
```

The cleanest spot: add the call at the top of `HouseholdRealtimeProvider`'s effect *guarded by a module-level `didInitialPurge` ref* so it runs exactly once per page load, before the provider opens its own channel. This avoids changing `App.tsx`'s structure and ensures the purge runs before any `useRealtimeSubscription` subscribes.

**3. `src/components/settings/NotificationPreferencesSection.tsx` — scope the channel**

- Get `user.id` (already available via `useAuth` or fall back to fetching once).
- Rename channel to `profile-${user.id}`.
- Add `filter: \`id=eq.${user.id}\`` to the `postgres_changes` config.
- Add `user?.id` to the effect deps.

**4. Mutation invalidation fixes** (small additions, all in onSuccess):

| File | Mutation | Add invalidation for |
|------|----------|----------------------|
| `src/hooks/useTasks.ts` | createTask, updateTask, deleteTask | `["taskmaster-tasks", householdId]`, `["daily-plan"]`, `["dashboard-stats", householdId]` |
| `src/hooks/usePantryItems.ts` | add/update/delete | `["dashboard-stats", householdId]` |
| `src/pages/HouseholdMembers.tsx` | remove member | `["household-member-emails"]`, `["household"]` |
| `src/hooks/useHabits.ts` | logHabit | confirm `["household-habit-stats"]` present; add if missing |
| `src/hooks/useFinance.ts` | useCreateTransaction / useUpdateTransaction / useDeleteTransaction | confirm `finance-monthly-summary`, `finance-dashboard`, and (when `savings_goal_id`) `finance-savings-goals`; add any missing |

Each addition is a 1-line `queryClient.invalidateQueries({ queryKey: [...] })` in the existing onSuccess.

### Out of scope

- No DB / RLS / edge-function changes.
- No new realtime topics — the `HouseholdRealtimeProvider` already covers every shared table.
- No UI, data-model, or business-logic changes.

### Verification

After edits:
- `rg "supabase\.channel\(" src` returns exactly 3 callers — provider, generic hook, notification preferences — all with deterministic names and cleanup.
- Live test with `testuser@dealcompass.test / Test1234!`: add a transaction → navigate away → return → list shows the new row without manual refresh; member count is stable across navigations.