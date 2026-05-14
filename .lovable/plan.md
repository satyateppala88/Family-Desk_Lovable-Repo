## Three small routing/label fixes

### Fix 1 — `/settings/account` 404
In `src/App.tsx`, add a redirect route just before/after the `/account-settings` route:
```tsx
<Route path="/settings/account" element={<Navigate to="/account-settings" replace />} />
```
(`Navigate` is already imported and used by the existing `/taskmaster` redirect.)

### Fix 2 — `/tasks/all` 404
Same file, add:
```tsx
<Route path="/tasks/all" element={<Navigate to="/taskmaster/tasks" replace />} />
```

### Fix 3 — Header label "Taskmaster" → "Tasks"
Only one user-facing rendering of "Taskmaster" exists outside the SubNav/route names: `src/components/layout/Header.tsx:133`:
```ts
if (path.startsWith("/taskmaster")) return "Taskmaster";
```
Change to `return "Tasks";`. This drives the header title shown on every `/taskmaster/*` page.

Other `Taskmaster` references (component names, `useTaskmaster` hook, `TaskmasterSubNav`, the JSON-LD breadcrumb in `TaskmasterProjects.tsx`, the comment in `Header.tsx:59`, the long-form term in `TermsOfService.tsx`) are not the page title/breadcrumb the user is reporting and aren't shown as the breadcrumb header — they stay. The SubNav tab labels (`Today`, `All Tasks`, `My Tasks`, `Projects`, `Templates`, `Dashboard`) are already correct and untouched.

### Verification
1. Visit `/settings/account` → lands on `/account-settings`.
2. Click "View all tasks" on `/taskmaster/today` (or visit `/tasks/all`) → lands on `/taskmaster/tasks`.
3. Header on every `/taskmaster/*` page reads "Tasks" instead of "Taskmaster"; SubNav pills unchanged.