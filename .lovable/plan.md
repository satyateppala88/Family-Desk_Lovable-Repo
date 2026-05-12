# Finance module — fix the 4 reported issues

## Root causes

### 1. Can't add new categories
In `src/components/finance/CategorySelect.tsx`, the "Create new category" UI lives **inside** a Radix `<SelectContent>`. Two things break it:
- The `<Input>` is rendered inside a `Select` popover, which intercepts keystrokes for its built-in typeahead — every letter you type is treated as a select-item shortcut and the popover may close, so you can't actually type a name.
- The "Add" / Enter actions also bubble back into the Select, sometimes selecting whatever item the typeahead matched instead of creating the category.

This affects every dialog that uses `CategorySelect` (Transaction, Subscription, Budget).

### 2 + 3 + 4. Month filter doesn't persist across Finance pages
`useSelectedMonth` reads `?m=YYYY-MM` from the URL. Internal Finance navigation (`<Link to="/finance/transactions">`, etc.) doesn't carry the query string, so every sub-page lands without `?m=` and defaults to the current month.

Concrete consequence:
- User picks **April** on `/finance?m=2026-04`, sees "1 transaction this month".
- Clicks the Transactions tile → URL becomes `/finance/transactions` (no `?m=`) → page defaults to **May** (current).
- The April transaction is *not actually* visible in May; what the user sees on `/finance/transactions` is whatever happens to fall in May. Switching to April on Transactions then shows nothing only if there really is no April row — but the perceived "April txn shows in May too" comes from the page silently snapping back to May on every navigation.
- Issue #4 is literally this: the chosen month must follow the user across the whole module.

This single root cause explains issues 2, 3, and 4.

## Fix

### A. CategorySelect — move inline create out of the Select popover
Replace the inline `<Input>` inside `<SelectContent>` with a small **Dialog** triggered by a "+ Create new category" button at the bottom of the dropdown. The button closes the Select, opens the dialog, user types the name, hits Save → `useAddCustomCategory` runs → on success the dialog closes and the new category is auto-selected (`onValueChange(created.key)`).

Why a dialog, not a popover-inside-popover: Radix's nested popovers play poorly with focus traps; a dialog is the cleanest pattern for "secondary input flow from a select". Keeps the change isolated to one component, no API change for callers.

### B. Make selected month a true module-wide state (URL + localStorage)

Rewrite `src/hooks/useSelectedMonth.ts` so the source of truth is **localStorage**, with the URL `?m=` as an optional override:

- Storage key: `familydesk:finance:selected-month` → `"YYYY-MM"`.
- Resolution order on read: URL `?m=` → localStorage → current month.
- `setMonth(next)` writes to localStorage **and** updates the URL on the current page (so deep-linking and refresh still work).
- Cross-tab sync via the `storage` event so opening Finance in two tabs stays consistent.
- A small in-memory listener (custom event on `window`) so all components in the same tab re-render immediately when the month changes — React Query's `enabled`/`queryKey` will refetch automatically because the `month` value flows into existing query keys.

No database changes. No new tables. No change to query-key shape.

### C. Preserve `?m=` on internal Finance navigation
Add a tiny `useFinanceLinkTo(path)` helper (or a `<FinanceLink>` wrapper) that appends the current month as `?m=` when the selected month is not the current one. Use it in:
- `src/pages/Finance.tsx` — the 8 module tiles.
- `src/components/finance/FinanceNav.tsx` — the sub-nav pills.
- Any "Back to finance" / cross-finance links.

This keeps URLs shareable (the month is visible in the URL when non-current) while localStorage handles the "remember it across sessions" case.

### D. Verification (no schema changes needed)
After the fix:
1. On `/finance`, switch to April → click any tile → land on the sub-page with April pre-selected (URL shows `?m=2026-04`, MonthSwitcher reads "April 2026").
2. Hard-refresh `/finance/transactions` with no query string → still loads April (from localStorage).
3. On Transactions, switch to March → navigate to Budget → Budget shows March.
4. Open the Add Transaction dialog → category dropdown → "Create new category" → dialog opens, type "Pet care", Save → dialog closes, new category becomes selected, appears in dropdown.
5. Re-open the dropdown later — "Pet care" is in the list.

## Files to change

- `src/components/finance/CategorySelect.tsx` — replace inline create UI with a Dialog-based flow.
- `src/hooks/useSelectedMonth.ts` — add localStorage persistence + cross-tab sync, keep URL behavior.
- `src/pages/Finance.tsx`, `src/components/finance/FinanceNav.tsx` — preserve `?m=` on internal links via the new helper.
- (optional) `src/hooks/useFinanceLink.ts` — small helper that returns `to` strings/objects with `?m=` appended when non-current.

No migrations, no edge-function changes, no RLS edits.
