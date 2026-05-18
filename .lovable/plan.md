# FIX-11 — Reopen Completed Task from History

## Scope
Only `src/pages/TasksHistory.tsx` changes. No new files, no schema changes, no edits to other views.

## Schema notes (verified)
- Tasks use column `task_status` (enum: `backlog | today | in_progress | blocked | done`).
- Completed = `task_status = 'done'` with `completed_at` set.
- Default open status on creation in this codebase = `'backlog'` (see `src/lib/recurrence.ts`, `useTaskmaster.ts`).
- So "reopen" = `task_status: 'backlog'`, `completed_at: null`. (Prompt's "pending" is generic — `backlog` is the actual creation value here.)
- Active query keys in this project are `taskmaster-tasks` and `taskmaster-tasks-history` / `taskmaster-tasks-completed-count` (no `tasks` / `tasks-summary` keys exist). I'll invalidate the real keys to match the prompt's intent.

## Part 1 — UI: Reopen button on each row
In the existing row `<li>` inside `TasksHistory.tsx`, append a Reopen `<button>` after the assignees block:
- Inline styles to match exact spec: `border: 1px solid #6B6965`, `color: #6B6965`, `borderRadius: 6px`, `padding: 4px 10px`, `fontSize: 12px`, transparent background.
- Vertically centered (row already uses `items-center`).
- No icon. Disabled while its mutation is pending.

## Part 2 — Reopen behaviour
Add a `useMutation` inside `TasksHistory`:

```ts
const reopenTask = useMutation({
  mutationFn: async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ task_status: "backlog", completed_at: null })
      .eq("id", taskId);
    if (error) throw error;
  },
  onMutate: async (taskId) => {
    await queryClient.cancelQueries({ queryKey: ["taskmaster-tasks-history", householdId] });
    const snapshots = queryClient.getQueriesData({ queryKey: ["taskmaster-tasks-history", householdId] });
    queryClient.setQueriesData(
      { queryKey: ["taskmaster-tasks-history", householdId] },
      (old: any) => old ? { ...old, rows: old.rows.filter((r: any) => r.id !== taskId), total: Math.max(0, (old.total ?? 1) - 1) } : old,
    );
    return { snapshots };
  },
  onError: (_e, _id, ctx) => {
    ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    toast.error("Couldn't reopen task. Please try again.");
  },
  onSuccess: (_d, taskId) => {
    queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
    queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks-history", householdId] });
    queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks-completed-count", householdId] });
    queryClient.invalidateQueries({ queryKey: ["daily-plan"] });

    toast.success("Task reopened", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          const { error } = await supabase
            .from("tasks")
            .update({ task_status: "done", completed_at: new Date().toISOString() })
            .eq("id", taskId);
          if (error) { toast.error("Undo failed"); return; }
          queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
          queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks-history", householdId] });
          queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks-completed-count", householdId] });
        },
      },
    });
  },
});
```

Click handler on the button calls `reopenTask.mutate(task.id)`.

## Part 3 — Edge cases
- Empty state: optimistic removal already shrinks `rows`; existing `allRows.length === 0` branch will render the "No completed tasks yet" empty state automatically.
- The "View completed tasks →" link on All Tasks reads `taskmaster-tasks-completed-count`, which we invalidate — link disappears when count hits zero.
- Recurring tasks: single-row update by `id`, so only the specific occurrence is affected. No special handling.

## Imports to add in `TasksHistory.tsx`
- `useMutation, useQueryClient` from `@tanstack/react-query`
- `toast` from `sonner`

## Out of scope
No layout/grouping/sorting changes. No edit/delete actions. No changes to All Tasks beyond invalidation.
