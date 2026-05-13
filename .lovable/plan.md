## Goal
Extend the AI meal generator to also produce a daily Snack, save it as `meal_type = 'snack'`, and surface it in the existing Today tab Snacks card. Existing plans without snacks must continue to work.

## Changes

### 1. `supabase/functions/generate-meal-suggestions/index.ts`
- Update the system prompt header from "breakfast, lunch, and dinner" to "breakfast, lunch, dinner, and one snack" for each day.
- Extend the "Indian Meal Structure" section with a new bullet:
  > Snack: One light item per day, typically eaten around 4–5pm. Examples: poha, upma, samosa, pakoda, chivda, fruit chaat, roasted makhana, or chai with biscuits. Keep it light and realistic.
- Update the user message: `Generate ${numDays} days of meal suggestions (breakfast, lunch, dinner, snack) as a meal plan.`
- Update the tool schema `meal_type` enum to `["breakfast", "lunch", "dinner", "snack"]`.
- Add an instruction line: "For each day, output exactly 4 meals: breakfast, lunch, dinner, and snack."
- No change to the persistence loop — `meal.meal_type` is already passed through to the insert (line 468), so snacks get saved with `meal_type = 'snack'` automatically.

### 2. `src/components/meals/MealPlanCalendar.tsx` (small alignment)
- The week-grid currently uses the string `"snacks"` (plural) for its snack row, while the Today tab and AI now use `"snack"` (singular). Change `MOBILE_MEAL_TYPES` and the `MealSlot mealType="snacks"` references to `"snack"` so AI-generated snacks render in the week grid too. Keep the toggle behaviour and label "Snacks" unchanged.

### 3. No schema changes
`meal_plan_items.meal_type` is a free-text column with no CHECK constraint, so `'snack'` is already accepted. No migration needed.

## Out of scope
- `regenerate-meals` and `suggest-meals-for-slot` are not changed (slot-level regen for snacks already supported in `suggest-meals-for-slot`; per-slot regen UI for snacks can come later).
- No data backfill — older plans simply won't have a snack row, and the Today tab Snacks card already falls back to "+ Add" in that case (FALLBACK requirement).
- No changes to routing, data structure, or other meal slot behaviour.

## Verification
- Trigger "Generate Recipes" / meal plan generation → confirm `meal_plan_items` has 4 rows per day including `meal_type='snack'`.
- Today tab Snacks card shows the AI-suggested snack with Cooked / List actions.
- Open an older plan with no snack row → Snacks card still shows "+ Add".