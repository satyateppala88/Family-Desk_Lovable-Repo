## Three small mutation/UX fixes

### Fix 1 — Custom categories error/success toasts
**File:** `src/hooks/useCustomCategories.ts`

`useAddCustomCategory` already handles `onSuccess` (invalidates `["finance-custom-categories", householdId]` + success toast) and `onError` (with reserved/duplicate branches). The only spec gap is that the generic `onError` fallback uses `e.message` already — no change needed there. **Already compliant; no edit required.**

(Note: the spec's example key `['custom-categories', householdId]` is a typo in the request — the established key in this hook and in its realtime subscription is `["finance-custom-categories", householdId]`. Keeping it consistent is correct.)

### Fix 2 — Subscriptions: surface real error message
**File:** `src/hooks/useSubscriptions.ts` → `useCreateSubscription`

Two issues to address:
1. The success toast currently fires inside `onMutate` (optimistic), so the user sees "Subscription added" even when the insert later fails. Move the success toast to `onSuccess`.
2. `onError` currently shows a generic "Failed to add subscription". Change to surface the real reason:
   ```ts
   onError: (error, _v, ctx) => {
     ctx?.snapshots?.forEach(([key, prev]) => qc.setQueryData(key, prev));
     toast.error("Could not add subscription", { description: (error as Error)?.message });
   }
   ```
3. Keep the existing optimistic update + `qc.invalidateQueries({ queryKey: ["finance-subscriptions", householdId] })` in `onSuccess` so the list refreshes without reload.

No changes to `useUpdate`/`useDelete` (out of scope of the user's spec).

### Fix 3 — Pantry "Category" Select doesn't open
**File:** `src/components/grocery/AddPantryItemDialog.tsx`

The dialog is a Radix-Dialog-based `BottomSheet` whose `Overlay` and `Content` are both `z-50`. The shadcn `SelectContent` is also `z-50`, so the Select popover ends up at the same stacking level as the sheet content and can be intercepted by the overlay on some viewports. `BottomSheet` does not expose a `modal` prop, so the safest, narrowly-scoped fix is to force the Select dropdown above the sheet:

- On the Category `<SelectContent>`, add `className="z-[60]"`.
- Apply the same fix to the Unit `<SelectContent>` in the same dialog for consistency (it's the same pattern and likely also affected on small viewports).

No changes to `BottomSheet`, `ui/select`, or any other Sheet/Select usage elsewhere — keeps blast radius minimal.

### Verification
1. Add a subscription with a forced failure (e.g., temporarily break input) → red toast shows the actual error message, optimistic row rolls back.
2. Add a valid subscription → green "Subscription added" toast fires only after success; list updates immediately without reload.
3. Open Grocery → Add Pantry Item → tap Category → dropdown opens and items are selectable. Same for Unit.