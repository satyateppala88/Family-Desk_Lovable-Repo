## BUG-FIX-C58 — Root cause confirmed

`src/lib/meals/assignRecipeToSlot.ts` and `src/hooks/useMealPlans.ts` both call:

```ts
.upsert(
  { household_id, week_start_date, created_by },
  { onConflict: "household_id,week_start_date" }
)
```

But `meal_plans` has **no unique constraint** on `(household_id, week_start_date)` — only the PK on `id`. Postgres rejects this with HTTP 400: *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*. This explains why "Use this" on an AI suggestion (and any first-time meal plan save for that week) returns 400. The diagnostic steps from the brief (date format, missing field, AI shape) are not the cause here.

### Fix

1. **Migration** — add the missing unique constraint after de-duping any existing rows:
   ```sql
   -- Keep the oldest row per (household, week); delete the rest
   DELETE FROM public.meal_plans a
   USING public.meal_plans b
   WHERE a.household_id = b.household_id
     AND a.week_start_date = b.week_start_date
     AND a.ctid > b.ctid;

   ALTER TABLE public.meal_plans
     ADD CONSTRAINT meal_plans_household_week_unique
     UNIQUE (household_id, week_start_date);
   ```
   Note: dependent `meal_plan_items` for deleted plan rows cascade-delete via existing FK, which is acceptable since duplicates shouldn't exist in healthy data.

2. **Defensive logging** — add `console.error("[meal-plan upsert]", error)` in `assignRecipeToSlot` and `useMealPlans.createMealPlan` so any future Supabase error surfaces full `message/details/hint` instead of a generic toast.

No code changes to payload shape are needed — current fields (`household_id`, `week_start_date` ISO, `created_by`) already match the schema.

## BUG-FIX-C33 — Project not found after template

`TaskmasterTemplates.handleConfirm` awaits `bulkCreateFromTemplate.mutateAsync` and then `navigate("/taskmaster/projects/:id")`. The destination page `TaskmasterProjectDetail` reads `projects` from `useProjects` (list query). The invalidation fired in `onSuccess` is asynchronous; on first render `projects.find(p => p.id === id)` is `undefined` while the refetch is in flight, so the "Project not found" empty state shows.

### Fix

In `src/pages/TaskmasterProjectDetail.tsx`, treat the project as "still loading" while the projects query is fetching, even after `isLoading` is false:

- Pull `isFetching` from `useProjects` (return it from the hook).
- Show the skeleton block when `loadingProjects || isFetching` and `!project`.
- Only render the "Project not found" card when the query has settled (`!isFetching`) and `project` is still missing.

Smallest change: expose `isFetching` from `useProjects` alongside `isLoading`, and gate the not-found branch on `!isFetching`.

## Files

- New migration adding unique constraint on `meal_plans(household_id, week_start_date)` (with dedupe).
- `src/lib/meals/assignRecipeToSlot.ts` — add error logging.
- `src/hooks/useMealPlans.ts` — add error logging in createMealPlan.
- `src/hooks/useProjects.ts` — expose `isFetching`.
- `src/pages/TaskmasterProjectDetail.tsx` — gate not-found state on `!isFetching`.

## Verification

- C58: tap AI suggestion → "Use this" on an empty week → meal appears, no 400 in network tab.
- C33: apply a template → lands on project detail page showing the new project and its tasks, no "Project not found" flash.
