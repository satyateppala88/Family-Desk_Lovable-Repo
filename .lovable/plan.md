
# Taskmaster: restore sub-pages, add realtime, audit "shared household view" rule

## What I found

### A. Your missing Taskmaster sub-pages — they exist but are unreachable

The Tasks tile on the home hub points to `/tasks`, which renders `TaskmasterToday`. But Taskmaster has **5 full pages** in the codebase, and 4 of them have no UI link anywhere:

| Page | Route | Linked from UI? |
|---|---|---|
| Today (AI daily plan) | `/taskmaster/today` (and `/tasks`) | ✅ hub tile |
| All Tasks (full backlog) | `/taskmaster/tasks` | ❌ orphaned |
| My Tasks (assigned to me) | `/taskmaster/my-tasks` | ❌ orphaned |
| Projects | `/taskmaster/projects` + `/:id` | ❌ orphaned |
| Dashboard (analytics) | `/taskmaster/dashboard` | ❌ orphaned |

There's also no `/taskmaster` hub route — only deep links work. That's why you only see Today.

### B. "All household members see the same view" — current state audit

I checked every public table for `household_id` vs `user_id` filtering. Here's the truth:

**Already shared across the household (correct):**
- `tasks`, `projects`, `task_categories`, `task_comments`, `task_assignees`
- `meal_plans`, `recipes`, `pantry_items`, `shopping_lists`, `pantry_categories`
- `finance_*` (accounts, transactions, budgets, savings, subscriptions, cards, snapshots)
- `habits`, `habit_logs`, `habit_streaks`, `habit_scores` (data is shared; only logging is per-user)
- `calendar_settings`, `dietary_preferences`, `household_preferences`, `household_family_members`, `ai_suggestions`, `household_habit_goals`

**Per-user by design (rule conflicts — needs your call):**
- **`daily_plans`** — each member generates and sees their own AI daily plan. RLS: `user_id = auth.uid()`.
- **`ai_conversations` / `ai_messages`** — each member's AI Assistant chat is private.
- **`finance_chat_sessions` / `finance_chat_messages`** — same, private finance chat.
- **`calendar_connections`** — each member's Google account tokens are private (security requirement).
- **`notification_preferences`, `user_email_preferences`, `push_subscriptions`** — per-device/per-user settings.
- **`habit_coach_recommendations`** — personal nudges.
- **`user_onboarding_progress`, `user_habit_badges`, `permission_events`** — personal records.

**Conclusion on the rule:** "All household members see the same data" is true for all shared family data (tasks, finance, meals, calendar, habits). It conflicts with **5 categories of intentionally private data** above (daily AI plan, private chats, OAuth tokens, personal settings, personal achievements). I do **not** recommend making those shared — daily plan would lose its personal relevance, and OAuth tokens are a security boundary.

### C. Realtime is not enabled — that's why members don't see each other's edits

`supabase_realtime` publication has **zero tables** in it. So when a household member adds or updates a task, other members won't see it until they refresh. This is the core of your "same view" complaint.

## Plan

### 1. Restore Taskmaster navigation (orphaned pages)

- **Add `TaskmasterSubNav` component** mirroring `FinanceNav` pill-style: tabs for Today · All Tasks · My Tasks · Projects · Dashboard.
- **Mount SubNav on all 5 Taskmaster pages** (Today, Tasks, My Tasks, Projects, ProjectDetail, Dashboard).
- **Add `/taskmaster` route** that redirects to `/taskmaster/today` (so the hub tile and back-button work cleanly).
- **Update hub tile** in `src/pages/Index.tsx` line 39: change `/tasks` → `/taskmaster/today` for clarity (keep `/tasks` route as alias for backward-compat).

### 2. Add realtime so all members see updates instantly

- **Migration:** add to `supabase_realtime` publication: `tasks`, `task_assignees`, `task_comments`, `projects`, `daily_plans`, `daily_plan_items`.
- **New hook `useRealtimeSubscription(table, queryKeys[], filter?)`** — single reusable hook that subscribes to `postgres_changes` on a table (filtered by `household_id` where applicable) and invalidates the matching React Query keys.
- **Wire into Taskmaster pages:** subscribe to `tasks`, `projects`, `task_assignees`, `daily_plans`, `daily_plan_items` filtered by current household. On any change → invalidate `["taskmaster-tasks", householdId]`, `["projects", householdId]`, `["daily-plan", householdId, ...]`.
- **Extend to other shared modules** in the same PR (low cost): `meal_plans`, `meal_plan_items`, `shopping_lists`, `shopping_list_items`, `pantry_items`, `finance_transactions`, `habits`, `habit_logs`. This makes the whole app feel live for the household.

### 3. Make the "shared with household" model visible in UI

- On `TaskmasterTaskDialog` and `QuickTaskInput`: small helper text "Visible to everyone in your household".
- On All Tasks cards: show creator name/avatar (data is in `tasks.created_by`; join `profiles`).
- On Today empty state: change "No tasks in today's plan" → "Nothing scheduled for today" + show backlog count + "View all tasks" link to `/taskmaster/tasks`.

### 4. Decisions needed from you (rule conflicts)

For the 5 categories of intentionally per-user data, default is to **keep them per-user**. Confirm or override:

| Data | Default | Override to shared? |
|---|---|---|
| Daily AI plan (`daily_plans`) | Per-user | Risky — loses personal focus. **Recommend keep per-user**, but add a "Household plan" view later if needed. |
| AI Assistant chats | Per-user | **Keep per-user** — privacy. |
| Finance AI chat | Per-user | **Keep per-user** — privacy. |
| Google Calendar tokens | Per-user | **Must keep per-user** — security. (Calendar *events* are already merged into the unified family view.) |
| Notification/push settings | Per-user | **Must keep per-user** — per-device. |

If you want any of these flipped to shared, say which ones and I'll add the migration.

## Files I'll create / change

**New:**
- `src/components/taskmaster/TaskmasterSubNav.tsx` — pill-style nav (mirror of `FinanceNav`)
- `src/hooks/useRealtimeSubscription.ts` — reusable realtime hook

**Edited:**
- `src/App.tsx` — add `/taskmaster` redirect route
- `src/pages/Index.tsx` — hub tile path
- `src/pages/TaskmasterToday.tsx` — mount SubNav, improve empty state, wire realtime, add "Visible to household" helper
- `src/pages/TaskmasterTasks.tsx` — mount SubNav, show creator avatar, wire realtime
- `src/pages/TaskmasterMyTasks.tsx` — mount SubNav, wire realtime
- `src/pages/TaskmasterProjects.tsx` — mount SubNav, wire realtime
- `src/pages/TaskmasterProjectDetail.tsx` — mount SubNav, wire realtime
- `src/pages/TaskmasterDashboard.tsx` — mount SubNav, wire realtime
- `src/components/taskmaster/QuickTaskInput.tsx` and `TaskmasterTaskDialog.tsx` — "Visible to household" helper
- `src/pages/Tasks.tsx` — empty-state microcopy fix
- `src/components/layout/Header.tsx` — back-button mapping for `/taskmaster` hub

**Migration:**
- One migration adding the listed tables to `supabase_realtime` publication. No schema changes.

## Open questions

1. SubNav order — keep my proposed order (Today · All Tasks · My Tasks · Projects · Dashboard) or reorder?
2. Confirm defaults in the rule-conflict table above (keep daily plan, AI chats, calendar tokens, settings as per-user)?
3. Scope of realtime — do realtime for **all shared family modules** (tasks, meals, grocery, finance, habits) in this PR, or restrict to **Taskmaster only** for now?
