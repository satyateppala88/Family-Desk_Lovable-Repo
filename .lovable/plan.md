## FIX-08 — Remove setup modals + welcome toast

### Part 1: Remove ModuleSetupGate wrappers (keep Meals)

Strip `ModuleSetupGate` from these pages (delete the import, unwrap the JSX it surrounds — keep all children intact):
- `src/pages/Finance.tsx` (line 211/213)
- `src/pages/Calendar.tsx` (line 209/211)
- `src/pages/FinanceTrends.tsx` (line 25/217)
- `src/pages/FinanceReport.tsx` (line 13/73)
- `src/pages/Habits.tsx` (line 424/426)
- `src/pages/Grocery.tsx` (line 841/843)

Keep `Meals.tsx` gate as-is (explicitly excluded by the brief).

Note: there is no separate Budget setup modal — `/finance/budget` (`FinanceBudget.tsx`) has no `ModuleSetupGate`. Confirmed via grep. So "Budget setup" disappears automatically.

### Part 2: Dead-code cleanup

After unwrapping, these become unused — delete them:
- `src/components/onboarding/ModuleSetupGate.tsx`
- `src/components/onboarding/ModuleSetupGate.test.tsx`
- `src/hooks/useModuleSetup.ts` (only consumed by the gate)

Keep, because they remain in use by the dashboard setup banner and progress card (`Index.tsx`, `SetupProgressCard.tsx`, `UserPreferencesOnboarding.tsx`, onboarding flow):
- `src/lib/moduleSetup.ts`
- `MODULE_SETUP_KEYS`, `isModuleSetupComplete`, `*_setup_complete` DB columns

No DB migration. No changes to the dashboard "Let's finish setting up" banner (that's not a modal).

### Part 3: Replace dashboard welcome modal with one-time toast

In `src/pages/Index.tsx`:
- Remove `OnboardingTour` import, `dashboardTourSteps`, `runOnboarding` state, `welcomeVisible`, `shouldShowWelcome`, `welcomeAlreadyDone`, `localWelcomeDone`, `WELCOME_KEY`, `completedTours` query, `handleOnboardingComplete`, `handleStartOnboarding`, the `<OnboardingTour …>` JSX, and the setTimeout that triggers it.
- Header's `onStartOnboarding` prop: pass a no-op or remove if optional (verify in `Header.tsx`).
- Simplify the notification primer effect: drop the `welcomeVisible` gate, keep the rest.
- Add a new effect that fires the welcome toast:
  ```ts
  useEffect(() => {
    if (!user?.created_at) return;
    const isNewUser = Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000;
    if (!isNewUser) return;
    const key = `fd_welcome_toast_shown:${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const firstName = user.user_metadata?.display_name?.split(" ")[0] || "there";
    toast(`Welcome to FamilyDesk, ${firstName}! 👋`, {
      description: "Your household is set up and ready.",
      duration: 4000,
      closeButton: true,
    });
  }, [user]);
  ```
- Import `toast` from `sonner`. Session-storage guard prevents duplicate fires from re-mounts inside the 5-minute window; the time check handles all later sessions.

### Part 4: Info banners

`ModuleNudgeBanner` (used by `Finance.tsx`, `Calendar.tsx`, `Tasks.tsx`) **already** has an X button and per-user localStorage dismissal (`fd_module_nudge_dismissed:<userId>:<moduleKey>`). No work needed — verify and move on.

---

## FIX-09 — Tasks history

### Part 1: Filter `/tasks` to open tasks at the query level

In `src/hooks/useTasks.ts`:
- Add an optional `includeCompleted?: boolean` (default `false`) parameter alongside `pagination`.
- In the Supabase query, when not including completed, append `.neq("status", "completed")`. Apply to both the rows query and the `count: "exact"` count so `totalCount`/`activeCount` are correct. (The schema uses the single value `"completed"` — confirmed in `Tasks.tsx` line 57 and `TaskCard.tsx`.)
- Update the query key to include the flag: `["tasks", householdId, page, pageSize, includeCompleted]`.

In `src/pages/Tasks.tsx`:
- Calls `useTasks(householdId)` → now returns only open tasks.
- Remove the in-memory `t.status !== "completed"` filter for `activeCount` (the list is already filtered).
- The status filter `<Select>` currently offers "completed" as an option — drop the completed option from that select (it would always return 0 now) and keep "all / pending / in-progress".

### Part 2: "View completed tasks →" link

- Add a small query in `Tasks.tsx` (or extend `useTasks`) that returns just the count of completed tasks for the household:
  ```ts
  const { data: completedCount } = useQuery({
    queryKey: ["tasks-completed-count", householdId],
    queryFn: async () => {
      const { count } = await supabase
        .from("tasks").select("id", { count: "exact", head: true })
        .eq("household_id", householdId).eq("status", "completed");
      return count ?? 0;
    },
    enabled: !!householdId,
    staleTime: 60_000,
  });
  ```
- Render below the last task card, above the FAB/bottom-nav:
  ```tsx
  {completedCount > 0 && (
    <div className="mt-4 text-left">
      <Link to="/tasks/history" className="text-[13px] text-fd-ink-3 hover:text-fd-ink underline-offset-2 hover:underline">
        View completed tasks →
      </Link>
    </div>
  )}
  ```

### Part 3: `/tasks/history` page

Create `src/pages/TasksHistory.tsx`:
- Header with back arrow → `navigate("/tasks")`, title "Completed Tasks".
- Query `tasks` where `household_id = … AND status = 'completed'`, order `completed_at desc nulls last, created_at desc`, range-paginated 30 per page. Track `page` in state; "Load more" button appends results client-side.
- Group rendered items by month using `format(date, "MMMM yyyy")` on `completed_at ?? updated_at`.
- Per row: greyed strikethrough title (`text-fd-ink-3 line-through`), small `Completed {format(date, "d MMM")}` line, optional assignee avatar (reuse the avatar bit from `TaskCard`). Read-only — no checkbox/edit/delete.
- Empty state: `EmptyState` component with check icon, "No completed tasks yet" / "Tasks you complete will appear here".

Register the route in `src/App.tsx` under the protected routes block, next to `/tasks`:
```tsx
<Route path="/tasks/history" element={<ProtectedRoute><TasksHistory /></ProtectedRoute>} />
```

### Out of scope

- My Tasks, Projects, Templates tabs untouched.
- Task completion flow untouched.
- No DB migrations.
- Taskmaster pages (`/taskmaster/*`) untouched — only `/tasks` is in scope.