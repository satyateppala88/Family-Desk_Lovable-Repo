## E-03 — "What's for dinner tonight?" — Meals redesign

Restructure `/meals` so the daily flow leads, the weekly grid becomes secondary, and an AI suggestion flow drives same-day decisions.

### New page structure (`src/pages/Meals.tsx`)

```
[ Header / page heading + Export ]

[ TonightDinnerCard ]              ← prominent, full-width
[ TodayMealsRow ]                  ← horizontal scroll: B / L / D / Snacks
[ "Plan the week" toggle ]         ← collapsed by default
   └─ existing Calendar tab content (WeekNavigator + MealPlanCalendar)
[ All Recipes tab ]                ← unchanged
```

The existing two-tab structure is reframed: **Today** (new default) and **All Recipes** (unchanged). The week grid moves inside the Today view as a collapsible section so we don't lose the planner.

### New components (`src/components/meals/`)

1. **`TonightDinnerCard.tsx`** — full-width card.
   - Empty state: sparkle icon, "What's for dinner tonight?", subtext, primary "Suggest dinner" button (opens `AiSuggestSheet` pre-set to dinner).
   - Filled state: meal title, image placeholder (use recipe.image_url if present, else neutral surface tile), "Change" button (opens `AddMealSheet`), "Add ingredients to shopping list" button (calls shared `addRecipeToShoppingList` helper).

2. **`TodayMealsRow.tsx`** — horizontal scroll row of 4 compact slot cards (Breakfast, Lunch, Dinner, Snacks).
   - Filled slot: meal name + tap → opens `RecipeDetailDialog`.
   - Empty slot: "+ Add" → opens `AddMealSheet` for that slot.

3. **`AddMealSheet.tsx`** — bottom Sheet, 3 rows: AI Suggest, Browse Recipes, Enter manually.
   - AI Suggest → opens `AiSuggestSheet` for the slot.
   - Browse Recipes → opens existing `RecipeBrowserSheet`.
   - Enter manually → small inline form (title only) that creates a quick recipe + meal_plan_item.

4. **`AiSuggestSheet.tsx`** — bottom Sheet, drives the AI suggest flow.
   - Loading: "Checking your pantry and preferences..." skeleton card.
   - Loaded: 3 suggestion cards (name, prep time, key ingredients, "Use this").
   - Error/timeout: "Couldn't connect right now. Try again?" + Retry. 30s timeout via `AbortController` + `setTimeout`. **No infinite spinner.**
   - On "Use this": assign to slot, then show inline confirmation "Added! Want to add missing ingredients to your shopping list?" with Yes/No. Yes → navigate to `/grocery?tab=shopping&newList=<encoded meal name> ingredients&items=<csv of ingredients>`.

5. **`WeekPlanSection.tsx`** — wraps the existing `WeekNavigator` + `MealPlanCalendar` + "Generate Meal Plan" button inside a collapsible (`<Collapsible>` from shadcn). Trigger labeled "Plan the week" with chevron, collapsed by default.

### Shared helpers

- **`src/lib/meals/addRecipeToShoppingList.ts`** — given a recipe + householdId, navigate to `/grocery?tab=shopping&newList=...&items=...`. Centralises the encoding so `TonightDinnerCard` and `AiSuggestSheet` share it.

- **`/grocery` page** — read the new query params on mount. If `newList` + `items` present, create a shopping list with that name and pre-populate items, then clear the params. (Small, additive change in `src/pages/Grocery.tsx`.)

### AI suggest backend

Reuse `generate-meal-suggestions` edge function but call it with a new mode `singleSlot`:
- Body: `{ householdId, userId, mode: "singleSlot", mealType, count: 3 }`
- Returns: `{ suggestions: [{ title, prep_time_minutes, ingredients: [...], ...recipeFields }] }` — does **not** persist; the client persists only the chosen one via existing recipe + meal_plan_item insert paths.
- Update the function to branch on `mode`. Keep existing weekly flow untouched.

### Slot assignment

Today the page only toasts on assign (`handleAssignRecipe`). Add a real assignment helper (`assignRecipeToSlot`) that inserts/updates a `meal_plan_item` for the current week + day index + meal_type, creating the `meal_plan` row if missing. Used by `TonightDinnerCard`, `TodayMealsRow`, `AddMealSheet`, and `AiSuggestSheet`.

### Things kept as-is

- `Generate Meal Plan` button — moved inside the collapsible week section.
- `All Recipes` tab — unchanged.
- `MealPlanDownload` (Export) button — unchanged, still in header.
- `RecipeDetailDialog`, `RecipeRatingDialog`, `MarkAsCookedDialog`, `RecipeBrowserSheet` — reused.
- Routing, auth, RLS, schema — unchanged.

### Out of scope

- No DB migrations. `meal_plan_items` already supports the slots.
- No changes to grocery/shopping data model — only a query-param entry point.
- No redesign of week grid internals.

### Open question

For "Snacks" slot: `meal_plan_items.meal_type` currently supports `breakfast | lunch | dinner` in the regenerate hook signature. I'll confirm by reading the schema during implementation; if `snack` isn't an allowed value, I'll either (a) extend the enum via migration, or (b) make the Snacks card a "coming soon" tile. Will flag before adding a migration.