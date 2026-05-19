# Fix BUG-FIX-B4 — Savings Goal delete shows error after success

## Root cause

`useDeleteSavingsGoal` in `src/hooks/useFinance.ts` (lines 948–991) chains `.delete().select("id")` and then throws `"This goal couldn't be deleted — you may not have access."` whenever the returned array is empty.

`DELETE ... RETURNING` is filtered by the RLS **SELECT** policy, not the DELETE policy. If a user is allowed to delete the row but the SELECT policy doesn't match the row in the same statement (e.g. household scoping mismatch on returning rows), Postgres returns 0 rows even though the delete succeeded. That's exactly the symptom: row is gone, toast says it failed.

## Change

In `src/hooks/useFinance.ts`, `useDeleteSavingsGoal.mutationFn`:

- Drop the `.select("id")` chain and the `data.length === 0` throw.
- Keep the delete scoped by `id` (already optimistic-removed in `onMutate`; RLS still enforces ownership).
- Only throw when `error` is set.

Resulting shape:

```ts
mutationFn: async (id: string) => {
  const { error } = await supabase
    .from("finance_savings_goals")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return id;
},
```

`onMutate` / `onError` rollback / `onSuccess` toast / `onSettled` invalidation stay unchanged.

## Files

- `src/hooks/useFinance.ts` — modify `useDeleteSavingsGoal` only.

## Verification

- Delete a savings goal → single "Goal deleted" toast, row stays gone after refetch.
- Simulate failure (offline) → `onError` shows the real Postgres error message and the optimistic removal rolls back.
