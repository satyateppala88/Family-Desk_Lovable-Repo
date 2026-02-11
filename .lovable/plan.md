

# Website Performance Optimization Plan

## Issues Identified

After reviewing the codebase, network requests, and session replay, here are the root causes of the slowness:

### 1. Repeated Failing Network Requests (Most Impactful)
- **`household_invitations` returns 403 on every load** -- "permission denied for table users". This request fires repeatedly (visible in network logs -- 8+ times) due to React Query retries. The RLS policy on `household_invitations` likely references the `users` table without proper permissions.
- **`task_assignees` returns 400** -- "Could not find a relationship between task_assignees and profiles". This fails every time tasks are loaded, adding wasted network roundtrips.

### 2. No Caching / staleTime on Key Queries
Most hooks have **no `staleTime`**, meaning React Query refetches data on every component mount and window focus:
- `useTaskmaster` -- fetches ALL tasks every time any Taskmaster page mounts
- `useProjects` -- refetches on every mount
- `useHousehold` -- refetches on every mount (called by Header, MobileNav, AIChatWidget, and the page)
- `usePendingInvitations` -- refetches on every mount (and fails with 403)
- `useIsHouseholdAdmin` -- uses raw `useEffect` instead of React Query, so it re-runs on every render and has no caching at all

### 3. No Code Splitting
All 20+ page components are eagerly imported in `App.tsx`. The entire Recharts library, jsPDF, react-joyride, and every page's code is loaded upfront -- even if the user only visits the dashboard.

### 4. Fetching ALL Tasks Without Limits
`useTaskmaster` fetches every task in the household with no pagination or limit. As tasks grow, this query becomes increasingly slow.

### 5. Waterfall Requests
On the Dashboard page, the request chain is:
1. Auth session check
2. `useHousehold` (2 sequential queries: household_members then households)
3. Only then: tasks, projects, invitations, enabled products, admin check -- all in parallel but delayed

---

## Optimization Plan

### Step 1: Fix Failing Requests (Biggest Win)

**File: `src/hooks/usePendingInvitations.ts`**
- Add error handling so the 403 failure doesn't trigger React Query's default 3 retries
- Set `retry: false` and add `staleTime: 5 * 60 * 1000`

**File: `src/hooks/useTaskmaster.ts`**
- Guard the `task_assignees` query: if `taskIds` is empty, skip the query
- The current code sends `task_id=in.()` (empty list) which causes the 400 error

### Step 2: Add staleTime to All Core Hooks

| Hook | Current staleTime | Proposed staleTime |
|------|-------------------|-------------------|
| `useTaskmaster` | 0 (default) | 30 seconds |
| `useProjects` | 0 (default) | 60 seconds |
| `useHousehold` | 0 (default) | 5 minutes |
| `usePendingInvitations` | 0 (default) | 5 minutes |
| `useIsHouseholdAdmin` | N/A (useEffect) | Convert to React Query, 10 minutes |

### Step 3: Convert useIsHouseholdAdmin to React Query

**File: `src/hooks/useIsHouseholdAdmin.ts`**
- Replace the raw `useState`/`useEffect` pattern with `useQuery`
- This gives automatic caching, deduplication, and avoids redundant fetches

### Step 4: Add Code Splitting with React.lazy

**File: `src/App.tsx`**
- Wrap all page imports with `React.lazy()` and `Suspense`
- This ensures Recharts, jsPDF, react-joyride, and heavy page components are only loaded when navigated to

Example:
```typescript
const TaskmasterDashboard = lazy(() => import("./pages/TaskmasterDashboard"));
const Meals = lazy(() => import("./pages/Meals"));
// etc.
```

### Step 5: Limit Task Fetching

**File: `src/hooks/useTaskmaster.ts`**
- Add a reasonable limit (e.g., 500 tasks) to prevent unbounded queries
- For the Dashboard specifically, only open tasks are needed -- consider a separate lightweight query

### Step 6: Optimize useHousehold

**File: `src/hooks/useHousehold.ts`**
- Add `staleTime: 5 * 60 * 1000` -- household membership rarely changes during a session
- This alone prevents 4+ redundant fetches per page load (Header + MobileNav + AIChatWidget + page)

---

## Expected Impact

| Change | Impact |
|--------|--------|
| Fix 403/400 errors | Eliminates 10+ wasted requests per page load |
| Add staleTime | Prevents 15+ redundant fetches on navigation |
| Code splitting | Reduces initial bundle by ~40-50% (Recharts alone is ~200KB) |
| Convert useIsHouseholdAdmin | Removes 1 raw fetch per page, adds caching |
| Limit tasks | Prevents slow queries as data grows |

---

## Technical Details

### Files to modify:
1. **`src/App.tsx`** -- Add `React.lazy` + `Suspense` for all page imports
2. **`src/hooks/useTaskmaster.ts`** -- Add staleTime, guard empty task_assignees query, add limit
3. **`src/hooks/useProjects.ts`** -- Add staleTime
4. **`src/hooks/useHousehold.ts`** -- Add staleTime
5. **`src/hooks/usePendingInvitations.ts`** -- Add staleTime, retry: false
6. **`src/hooks/useIsHouseholdAdmin.ts`** -- Rewrite with useQuery

