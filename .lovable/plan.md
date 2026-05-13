## Goal

Give the "Generate Recipes" button on the **All Recipes** tab proper loading / success / error feedback, replace the empty-state copy, and stop the success path from blanking the screen with a full reload. No backend / AI logic changes.

## Why feedback is currently invisible

`handleGeneratePlan` already sets `generatingPlan = true`, but:
- The `EmptyState` action button doesn't read that flag, so it stays enabled with the static label "Generate Recipes".
- On success the page calls `window.location.reload()`, which wipes the toast before it can render — looking like "nothing happened".
- There is no timeout, so a stalled edge function leaves the user waiting indefinitely with no UI feedback.

## Changes

### 1. `src/components/ui/empty-state.tsx`
Extend the `action` prop to support a loading state:
```ts
action?: {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary";
  loading?: boolean;
  loadingLabel?: string;
};
```
When `loading` is true, render the action button as `disabled` with a `Loader2` spinner and `loadingLabel` (fallback "Working…"). Same for the meal-plan tab's existing button so both flows share one source of truth.

### 2. `src/pages/Meals.tsx` — `handleGeneratePlan`
- Wrap the `supabase.functions.invoke(...)` call in a 30-second timeout (`Promise.race` with `setTimeout` rejecting `new Error("timeout")`). On timeout, throw → existing friendly error path runs.
- Replace `window.location.reload()` with:
  - `queryClient.invalidateQueries({ queryKey: ["recipes", householdId] })`
  - `queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] })`
- When the **All Recipes empty-state** triggered the call (i.e. `recipes.length === 0` before the call), show the toast `"Recipes generated for your household"`. The existing weekly-plan success toast stays for the Plan tab path. Track which path triggered it via an optional `source: "recipes" | "plan"` argument so we don't conflate copy.

### 3. `src/pages/Meals.tsx` — All Recipes tab UI
- While `generatingPlan && recipes.length === 0`, render a small skeleton grid (3 `Skeleton` cards using existing `@/components/ui/skeleton`) **in place of** the `EmptyState`.
- Otherwise show `EmptyState` with:
  - Updated `description`: `"Tap 'Generate Recipes' to get personalised meal ideas for your family"`
  - Action: `{ label: "Generate Recipes", loading: generatingPlan, loadingLabel: "Generating recipes…", onClick: () => handleGeneratePlan("full", "recipes") }`

### 4. Existing Plan tab button
Already uses `generatingPlan` to swap label — no further change other than passing `"plan"` as the source.

## Verification
- Click "Generate Recipes" on empty All Recipes tab → button disables, shows spinner + "Generating recipes…", skeleton cards appear, no blank screen.
- On success → recipes render via cache invalidation, toast "Recipes generated for your household".
- Force a failure (offline / kill the function) → after up to 30 s, button restores, toast "Couldn't generate recipes. Please try again."
- Plan tab "Generate Meal Plan" still works and shows its existing success toast.

## Out of scope
- AI generation logic, edge function, or request payload.
- Other Meals empty states or the Plan tab UX beyond the success-path reload removal.
