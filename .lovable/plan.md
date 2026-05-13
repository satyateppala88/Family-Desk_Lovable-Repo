## Connect Meals → Grocery: missing-ingredients flow + cooked deduction

### Change 1 — "🛒 Add ingredients to list" with pantry-aware filtering

Replace the current "Add ingredients to shopping list" action (which dumps every ingredient via URL params and reloads `/grocery`) with an in-place modal that filters by what's actually missing from the pantry.

**New component: `src/components/meals/AddIngredientsDialog.tsx`**
- Props: `open`, `onOpenChange`, `recipe` (or `{ title, ingredients }`), `householdId`, `userId`.
- On open: fetches `pantry_items` for the household and computes a "missing" set.
  - Match strategy: case-insensitive, trimmed name match. If pantry item has `quantity > 0`, treat as in-stock; otherwise treat as missing. (Quantity-aware logic mirrors `handleMarkAsCooked` style.)
- Renders title `Missing ingredients for {Meal Name}`.
- Checklist of missing items, **all pre-checked**. In-stock items are listed in a muted "Already in your pantry" section (collapsed, not selectable).
- Primary button: `Add selected to shopping list`.
- On confirm:
  - If an `active` shopping list exists for the household, append items to it; otherwise create one named `{Meal Name} — {dd MMM}`.
  - Insert `shopping_list_items` rows (`name`, `quantity`, `unit`, `recipe_source: meal_title`, `is_checked: false`).
  - Invalidate `["shopping-lists", householdId]`.
  - Toast: `"{N} items added to {List Name}"` with an action button `View list →` that navigates to `/grocery?tab=shopping&list={listId}`.

**New helper: `src/lib/meals/groceryHelpers.ts`**
- `findMissingIngredients(ingredients, pantryItems)` → returns `{ missing: Ingredient[]; inStock: Ingredient[] }`.
- `addIngredientsToShoppingList({ householdId, userId, recipeTitle, items })` → upsert/insert logic shared by the dialog.

**Wiring (new entry points):**
1. `TonightDinnerCard` — replace the existing direct-navigation `Add ingredients to shopping list` button so it opens `AddIngredientsDialog` instead.
2. `TodayMealsRow` — when a slot is filled, add a small "🛒" icon button (or expose via long-press / overflow on the slot card). Tapping opens `AddIngredientsDialog` for that slot's recipe.
3. `MealPlanCalendar` — add a `ShoppingCart` icon next to the existing `ChefHat` action row (line ~152), wired to open the same dialog.
4. `RecipeDetailDialog` — add an `🛒 Add ingredients to list` button alongside existing actions for parity (same recipe path).

**Cleanup:**
- Remove `navigateToShoppingListWithIngredients` use from `TonightDinnerCard`. Keep `shoppingListBridge.ts` alive only for the AI suggest "Yes, add them" flow (it still needs to land on `/grocery` after suggesting), but replace its semantics: instead of URL-encoding items, route to `/grocery?tab=shopping` and have the AI sheet open `AddIngredientsDialog` *before* navigating — simpler: change the AI suggest "Yes" branch to also open `AddIngredientsDialog` for the just-assigned recipe and skip the URL-param dance entirely. Then delete `decodeIngredientsParam` from `Grocery.tsx` and `shoppingListBridge.ts`.

### Change 2 — "✓ Cooked" on meal slots with pantry deduction

The dialog (`MarkAsCookedDialog`) and dedup logic already exist in `Meals.tsx#handleMarkAsCooked`, and the calendar already shows a `ChefHat` button. Three gaps to close:

1. **Surface the action on Today's row + Tonight's dinner card.** Add a `✓ Cooked` button to:
   - `TonightDinnerCard` (filled state) — between `Change` and `Add ingredients to list`.
   - `TodayMealsRow` slot cards (filled state) — small footer row with `🛒` and `✓` icon buttons.
   Both call back into `Meals.tsx` via a new prop `onMarkAsCooked(recipe)` that opens the existing `MarkAsCookedDialog`.

2. **Improve `handleMarkAsCooked` deduction**:
   - Current logic uses `parseFloat(ingredient.quantity)` directly. Make it more resilient:
     - Strip non-numeric chars (e.g. `"2 medium"` → `2`).
     - If quantity is missing/NaN, fall back to default-per-unit (`1` for count items, `100` for `g`/`ml`).
     - Skip pantry items with quantity already at 0.
   - Collect a list of `{ name, qty, unit }` actually deducted and pass it back.
   - Surface to user via toast: `Pantry updated. You used: onions (2), tomatoes (3), dal (100g)` — list up to 5 items, then `+N more`.
   - **Invalidate** `["pantry-items", householdId]` and `["pantry-stats", householdId]` via `queryClient` (currently relies on realtime only).

3. **Optional: mark slot as cooked.** No `cooked_at` column on `meal_plan_items`. Cleanest path: add `cooked_at timestamptz` via migration, set it on confirm, and dim the slot in the calendar / show a small `✓` badge. **I'll flag this as a small migration before applying** — if you'd rather skip the schema bump, we can render the cooked state purely from the toast/transient UI, but it won't persist across reloads.

### Files touched

- New: `src/components/meals/AddIngredientsDialog.tsx`, `src/lib/meals/groceryHelpers.ts`.
- Edited: `src/components/meals/TonightDinnerCard.tsx`, `src/components/meals/TodayMealsRow.tsx`, `src/components/meals/MealPlanCalendar.tsx`, `src/components/meals/RecipeDetailDialog.tsx`, `src/components/meals/AiSuggestSheet.tsx`, `src/pages/Meals.tsx`, `src/pages/Grocery.tsx`, `src/lib/meals/shoppingListBridge.ts` (slimmed or deleted).
- Possibly: a small migration adding `meal_plan_items.cooked_at` (only if you want persistent "cooked" state).

### Out of scope

- No edge function changes — all matching/insert is client-side via existing tables.
- No changes to recipe/meal generation, calendar grid layout, or the AI suggest 3-card flow itself.

### Open question

Do you want `meal_plan_items.cooked_at` persisted (small migration) so a meal stays visibly "cooked" after reload, or is the toast + pantry update enough?