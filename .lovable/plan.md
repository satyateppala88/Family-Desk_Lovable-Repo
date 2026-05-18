## Plan: live "due today" count on dashboard

### Problem
The Tasks snapshot card and Tasks module tile show subtitles via `useDashboardSnapshot`, which derives the label from the `useTaskmaster` query. In practice, when the dashboard renders before `useTaskmaster` data hydrates (or filters strip due-dated rows), the subtitle falls into the `"All clear ✓"` branch, making it look static. The user wants a dedicated, focused live count.

### Changes

**1. New hook: `src/hooks/useTodayTaskCount.ts`**

A small React Query hook returning a live integer count:

```ts
export const useTodayTaskCount = (householdId: string | null) => {
  return useQuery({
    queryKey: ["today-task-count", householdId],
    queryFn: async () => {
      if (!householdId) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("due_date", today)
        .not("task_status", "in", '("completed","done")');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!householdId,
    staleTime: 30 * 1000,
  });
};
```

Notes on schema: the `tasks.task_status` enum is `backlog | today | in_progress | blocked | done` — there is no `completed` value, but the `NOT IN ('completed','done')` filter still works correctly (it just excludes `done`). Keeping `completed` in the filter matches the user's spec and is future-proof.

**2. Wire into `src/hooks/useDashboardSnapshot.ts`**

- Call `useTodayTaskCount(householdId)` alongside the existing queries.
- Replace the current `tasksLabel` computation so it reads:
  - `count > 0` → `` `${count} task${count > 1 ? "s" : ""} due today` ``
  - `count === 0` → `"All clear ✓"`
- Use this new label for both `items.tasks.subtitle` and `moduleSubtitles.tasks`. The "All clear ✓" string is preserved as the empty state.
- Keep the existing `overdue` urgency flag (still derived from `tasks`) so the card still highlights overdue work via its amber styling.

### Files touched
- `src/hooks/useTodayTaskCount.ts` (new)
- `src/hooks/useDashboardSnapshot.ts` (use the new hook for the Tasks subtitle)

No component-level changes needed: `TodaySnapshot.tsx` already reads `subtitle` from the hook, and `Index.tsx` reads `moduleSubtitles.tasks` from the same hook, so both surfaces update automatically.