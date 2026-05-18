
## Triage of pasted bug spec vs. actual code

Before doing 7 fixes blind, here's what I found when I checked the suspects against the real codebase. Several of the "root causes" in the spec don't match what's there.

### B2 — Savings goal delete not persisting

**Spec says:** missing `.eq('id', …)` filter and toast fires before the await.
**Actual code** (`src/hooks/useFinance.ts:907-937`):
- Delete already uses `.eq("id", id)` correctly.
- Toast fires in `onMutate` (optimistic), but DB call IS awaited inside `mutationFn`. On error, optimistic state is rolled back and an error toast shows.
- RLS policy exists: `Members can delete savings goals` via `household_members`.

If the goal really does reappear on refresh, the most likely real cause is the realtime/refetch reading from a cache that wasn't invalidated, or the user testing against a row whose `household_id` they aren't a member of. **I'd like to repro/log before changing this** — happy to add `.eq("household_id", householdId)` as a safety guard plus error-surface logging.

### B3 — "Where money went" bar inverted by `translateX(-93%)`

**Spec says:** chart uses `transform: translateX(-${100-pct}%)`.
**Actual code:** `ReportCard.tsx:90-97` already uses `width: ${widthPercent}%` correctly with proper `maxValue` scaling. The only `translateX` in the repo is the shadcn `Progress` component, which is the standard Radix pattern and is not "inverted".

Either this bug is already fixed, or it's referring to a different chart I haven't located. **Need a screenshot or page name** to find the right component.

### B1 — Budget delete button missing

Plausible. I need to open `BudgetDialog.tsx` and add: outlined red "Delete this budget" button → inline confirm → existing delete mutation (or add one) → invalidate `["budgets"]`, close modal, toast. Show "removes from all future months" warning when `is_recurring=true`.

### B4 — Custom category add not persisting

**Spec says:** insert missing `household_id`, toast fires before await.
**Actual code** (`src/hooks/useCustomCategories.ts:80-95`): insert already includes `household_id`, `created_by`, `key`, `label`, `scope`. Toast is in `onSuccess`. Table is `finance_custom_categories` with proper RLS.

If users see "success" but no row, real candidates: (a) silent RLS rejection (unlikely — policies look correct), or (b) `slugifyCategoryKey` collision with an existing key triggering the unique-constraint error path that still shows… no, that shows an error toast. **Need a repro** (what label was entered, what household).

### B6 — Budget member filter shows ₹0

Plausible — need to find `useBudgetByMember` or equivalent and verify it filters by `paid_by` not `created_by`/`user_id`. Will also check if existing transactions have `paid_by` populated and add a one-shot data backfill `UPDATE finance_transactions SET paid_by = created_by WHERE paid_by IS NULL`.

### B7 — Subscription edit: stale UI + Active→Paused side effect

Need to open `SubscriptionDialog.tsx` + `useSubscriptions.ts` to check:
1. Edit mutation `onSuccess` invalidates `["finance-subscriptions"]`.
2. Edit form isn't sending `is_active: false` (or similar status field) when not modified — likely an uncontrolled `<Select>` defaulting to "Paused".

### Missing bugs

The pasted spec skips B5 entirely, and B7 is cut off mid-sentence at `queryClient.invalidateQue…`. Let me know if there's more.

---

## Proposed approach

Rather than blindly applying all 7 "fixes" — three of which (B2, B3, B4) describe code that isn't what's in this repo — I want to split into two passes:

**Pass 1 — High-confidence, scoped fixes (no repro needed):**
- **B1**: Add Delete button + inline confirm + recurring warning in `BudgetDialog.tsx`.
- **B6**: Audit budget-per-member query, switch to `paid_by`, backfill nulls.
- **B7**: Fix subscription edit invalidation + audit status field default.

**Pass 2 — Needs your input:**
- **B2 / B3 / B4**: Either share a screenshot/repro steps so I can confirm the actual bug, OR tell me to apply the "safety hardening" version (extra `.eq("household_id")` guard, structured error logging, move B2's toast from `onMutate` to `onSuccess`) even though the spec's stated root cause isn't present.
- **B5**: Share the spec — it's missing from your message.
- **B7 (rest)**: The spec is cut off — paste the rest if there's more.

Approve this triage and I'll start Pass 1, then circle back on Pass 2 with your answers.
