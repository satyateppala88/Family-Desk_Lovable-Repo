## Goal
Apply Pass 2 defensive hardening + diagnostics to the five finance bugs. Most of the structural fixes from Pass 1 are already in place; this pass is about adding the missing telemetry (so we can confirm root causes) and patching the two real remaining gaps (B5 close-before-invalidate, B7 form prefill verification).

## Current state per bug (verified)

- **B2 — savings goal delete**: `useDeleteSavingsGoal` already uses `.delete().eq("id", id).select("id")` and throws when no row returns. RLS policy `Members can delete savings goals` exists and is correct. **No code change needed** — the existing throw is the equivalent of `count === 0`. Action: ask user to reproduce and share the toast/console error so we can confirm whether they hit RLS or another path.
- **B3 — inverted bar chart**: only one width-percent chart exists (`ReportCard.tsx`) and `maxValue = Math.max(...amounts)`, `widthPercent = amount/maxValue*100`. Math is correct. Add a one-time `console.log` so we can capture what the user actually sees.
- **B4 — custom category insert**: `useAddCustomCategory` already uses `.insert(...).select().single()`, which throws if no row. RLS `Members can insert household custom categories` exists. **No code change needed** — ask user to share the console error logged in `onError` (which already includes `householdId` + Postgres `code`).
- **B5 — savings goal edit stale**: dialog already calls `onOpenChange(false)` before mutation resolves, but `useUpdateSavingsGoal.onSuccess` invalidates immediately and the parent card may still be mounted reading optimistic data. Add a small delayed invalidate.
- **B7 — subscription edit flips to Paused**: `SubscriptionDialog` reads `setIsActive(initialData.is_active)`. If `initialData.is_active` is `undefined` (e.g. column not selected), this becomes `setIsActive(undefined)` and Switch renders as off → save sends `is_active: false`. Add diagnostic + a defensive `?? true` fallback for the edit path.

## Changes

### 1. `src/components/finance/ReportCard.tsx` (B3 diagnostic)
Add a dev-only log right after computing `maxValue`:
```ts
if (import.meta.env.DEV) {
  console.log("[ReportCard bars]", { maxValue, categories: report.topCategories });
}
```

### 2. `src/hooks/useFinance.ts` — `useUpdateSavingsGoal` (B5)
In `onSuccess`, replace the immediate invalidate with a deferred one so the dialog has unmounted by the time queries refetch:
```ts
onSuccess: () => {
  toast.success("Goal updated");
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
    queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
  }, 50);
},
```
Keep `onSettled` as the safety-net invalidator (also wrapped in the same 50 ms timeout).

### 3. `src/components/finance/SubscriptionDialog.tsx` (B7)
- Add diagnostic log inside the `useEffect` that hydrates from `initialData`:
  ```ts
  if (initialData && import.meta.env.DEV) {
    console.log("[SubscriptionDialog edit init]", {
      id: initialData.id,
      is_active: initialData.is_active,
      status_present: "is_active" in initialData,
    });
  }
  ```
- Harden the prefill so an undefined value never silently flips the toggle:
  ```ts
  setIsActive(initialData.is_active ?? true);
  ```

## Out of scope
- No RLS migrations (existing policies are correct for B2/B4).
- No changes to mutation structure for B2/B4 (already defensively coded in Pass 1).
- No chart math changes (B3) until diagnostic confirms the actual values.

## Verification
1. B3: open Monthly Review, check console for `[ReportCard bars]` and share the array.
2. B5: edit a savings goal, save, confirm the card updates without manual reload.
3. B7: edit an Active subscription without changes, save, confirm it stays Active; also check console log shows `is_active: true`.
4. B2/B4: attempt the failing action; share the resulting `toast.error` text + `[useAddCustomCategory] failed` / `[useDeleteSavingsGoal] failed` console payload so we can finalize.