## Goal

Stop redundant GETs after a user's own write. When the realtime channel echoes a row that was just written by the same user (and the cache is already correct via the optimistic update), skip the `invalidateQueries` call. Other members' writes still trigger a refetch as today.

## Mechanism

Two-part guard inside `useRealtimeSubscription`:

1. **Author check** — if `payload.new?.created_by === currentUserId` (or `payload.old?.created_by` for deletes), the row was written by this session.
2. **Recency window** — only skip when this session marked a self-write on that table within the last 2000 ms. This prevents accidentally swallowing a stale realtime event that arrives much later (e.g., reconnect replay).

Both must be true; otherwise invalidate as today. Tables without a `created_by` column are unaffected (the check fails and we fall back to invalidation).

## Files

- `src/hooks/useRealtimeSubscription.ts` — add guard + export `markSelfWrite(table)` helper.
- `src/hooks/useFinance.ts` — call `markSelfWrite` from `onMutate` of `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` (table: `finance_transactions`).
- `src/hooks/useHabits.ts` — call `markSelfWrite("habit_logs")` from `logHabit.onMutate`.

That covers the hot paths the user is feeling. The mechanism is opt-in: any other mutation continues to behave exactly as today until it adopts `markSelfWrite`.

## Changes

### 1. `useRealtimeSubscription.ts`

```ts
// Module-scoped registry: table -> last self-write timestamp (ms).
const SELF_WRITE_WINDOW_MS = 2000;
const selfWriteTimestamps = new Map<string, number>();

export function markSelfWrite(table: string) {
  selfWriteTimestamps.set(table, Date.now());
}
```

- Import `useAuth` and read `user?.id` in the hook.
- Replace the channel callback so it inspects `payload`:

```ts
(payload: any) => {
  const authorId = payload?.new?.created_by ?? payload?.old?.created_by;
  const ts = selfWriteTimestamps.get(cfg.table) ?? 0;
  const isOwnWrite =
    !!user?.id &&
    authorId === user.id &&
    Date.now() - ts < SELF_WRITE_WINDOW_MS;
  if (isOwnWrite) return;
  cfg.queryKeys.forEach((key) =>
    queryClient.invalidateQueries({ queryKey: key })
  );
}
```

- Add `user?.id` to the effect dep list (already covered indirectly by `signature`/`channelName`, but include explicitly to be safe).

### 2. `useFinance.ts`

- `import { markSelfWrite } from "@/hooks/useRealtimeSubscription";`
- In `useCreateTransaction.onMutate`, `useUpdateTransaction.onMutate`, `useDeleteTransaction.onMutate`: prepend `markSelfWrite("finance_transactions");`.

### 3. `useHabits.ts`

- `import { markSelfWrite } from "@/hooks/useRealtimeSubscription";`
- In `logHabit.onMutate`: prepend `markSelfWrite("habit_logs");`.

No DB or schema changes. No behavior change for non-author realtime events. No behavior change for tables that haven't adopted `markSelfWrite`.

## Result

- Optimistic mutations (finance txns, habit toggles) no longer trigger a self-echo refetch — the cache write stands and one network round-trip is eliminated.
- Other household members' writes still flow in via realtime and refetch as today.
- The 2-second window keeps the suppression safe against late echoes.
