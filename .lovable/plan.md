## F-22 — Budget: duplicate block, set indicator, edit mode

### Schema findings (no migration needed)

- Period is stored in a single text column `month` on `public.finance_budgets` (format `YYYY-MM`), not separate `period_month`/`period_year`.
- A unique constraint **already exists**: `finance_budgets_household_id_month_category_key (household_id, month, category)`. Skip Part 2 / Change 2 (no SQL to run).
- The category dropdown already excludes already-budgeted categories (`BudgetDialog` accepts `existingCategories` and `FinanceBudget` passes them in). Keep this; extend with the additional UX below.

### 1. "Budget set" chip on category cards

In `src/pages/FinanceBudget.tsx`, inside each row card (around the category-name flex row), render a small chip directly under the category name:

- Only shown when `Number(row.planned_amount) > 0` (matches the spec's "budget exists for current period" — `budgetRows` is already scoped to `currentMonth`).
- Markup: `<span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E6F2EE", color: "#0F6E56" }}>Budget set</span>`.
- Left-aligned, below the title, above the progress bar. Move the title + chip into a small vertical stack while keeping the percentage on the right.

### 2. Block duplicate creation

Disable "+ Add" when every selectable category is already budgeted for `currentMonth`.

- Compute `allCategoriesBudgeted` in `FinanceBudget.tsx`:
  - Selectable set = `FINANCE_CATEGORIES` minus income (`salary`, `freelance`, `investment_returns`) plus all `customCats` keys (scope `transaction`).
  - `budgetedSet = new Set((budgets || []).map(b => b.category))`.
  - `allCategoriesBudgeted = selectable.every(c => budgetedSet.has(c))`.
- Wrap the desktop and `QuickActionButton` "Add Budget" trigger with a `Tooltip` (shadcn). When disabled, tooltip text: `"All categories have budgets set. Edit an existing one to make changes."`
- Pass the same `existingCategories` to `BudgetDialog` (already wired).

Improve error handling in `useUpsertBudget.onError` (`src/hooks/useFinance.ts`):

```ts
onError: (e: any, _vars, ctx) => {
  ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
  if (e?.code === "23505") {
    toast.error("A budget for this category already exists. Use Edit to update it.");
  } else {
    toast.error(e?.message || "Failed to save budget. Please try again.");
  }
},
```

### 3. Edit existing budget via dialog

Today there is only an inline-input pencil next to the amount. Add a top-right pencil icon button on each budgeted card that opens `BudgetDialog` in edit mode. Keep the existing inline edit untouched (it still works, no scope creep).

Changes in `src/components/finance/BudgetDialog.tsx`:

- Add props: `mode?: "create" | "edit"`, `initialCategory?: string`, `initialAmount?: number`.
- When `mode === "edit"`:
  - Render Category as plain read-only text (resolved label via `resolveCategoryLabel`) instead of `CategorySelect`. No chevron.
  - Pre-fill `amount` from `initialAmount` (via a `useEffect` keyed on `open` + `initialAmount`).
  - Submit button label: `"Update Budget"` (saving state `"Updating..."`).
- Reset internal state when the sheet closes so the next open is clean.

Changes in `src/pages/FinanceBudget.tsx`:

- New state: `const [editingBudget, setEditingBudget] = useState<FinanceBudget | null>(null)`.
- Add a pencil `IconButton` (lucide `Pencil`, 16px, `text-[#6B6965]`, `aria-label="Edit budget"`) absolutely positioned top-right of each row card (only when `Number(row.planned_amount) > 0`).
- On click: `setEditingBudget(row)`.
- Render a second `BudgetDialog`:
  ```tsx
  <BudgetDialog
    open={!!editingBudget}
    onOpenChange={(o) => !o && setEditingBudget(null)}
    mode="edit"
    initialCategory={editingBudget?.category}
    initialAmount={Number(editingBudget?.planned_amount || 0)}
    onSave={(data) => upsertBudget.mutate({ month: currentMonth, category: editingBudget!.category, planned_amount: data.planned_amount })}
  />
  ```
  The upsert hits the unique key and updates the existing row (effectively an UPDATE by id+category+month).

### 4. Period scoping

Already correct: `useFinanceBudgets(householdId, currentMonth)` returns only the selected month's rows, so chip, "all budgeted" check, and edit button are intrinsically scoped to `currentMonth`. No extra work.

### Files touched

- `src/pages/FinanceBudget.tsx` — chip, top-right edit pencil, second `BudgetDialog`, disabled "+ Add" with tooltip, `allCategoriesBudgeted` calc.
- `src/components/finance/BudgetDialog.tsx` — `mode`/`initialCategory`/`initialAmount` props, read-only category in edit mode, dynamic submit label.
- `src/hooks/useFinance.ts` — `useUpsertBudget.onError` 23505 branch.

No DB migration. Out of scope: F-15 "By Member" view, categories page, deletion, progress-bar logic, monthly review flow.