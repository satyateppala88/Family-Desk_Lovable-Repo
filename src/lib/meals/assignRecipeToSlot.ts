import { supabase } from "@/lib/supabase";

/**
 * Insert or replace the meal_plan_item for a given household + week + day + meal_type.
 * Creates the meal_plan row if missing. Returns the meal_plan_item id.
 */
export async function assignRecipeToSlot(params: {
  householdId: string;
  userId: string;
  weekStartDate: string; // yyyy-MM-dd
  dayOfWeek: number; // 0-6
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId: string;
}) {
  const { householdId, userId, weekStartDate, dayOfWeek, mealType, recipeId } = params;

  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .upsert(
      { household_id: householdId, week_start_date: weekStartDate, created_by: userId },
      { onConflict: "household_id,week_start_date" }
    )
    .select()
    .single();
  if (planError) {
    console.error("[assignRecipeToSlot] meal_plans upsert failed", planError);
    throw planError;
  }

  // Remove any existing item in that slot
  await supabase
    .from("meal_plan_items")
    .delete()
    .eq("meal_plan_id", plan.id)
    .eq("day_of_week", dayOfWeek)
    .eq("meal_type", mealType);

  const scheduled = new Date(weekStartDate);
  scheduled.setDate(scheduled.getDate() + dayOfWeek);
  const scheduledDate = scheduled.toISOString().split("T")[0];

  const { data: item, error: itemError } = await supabase
    .from("meal_plan_items")
    .insert({
      meal_plan_id: plan.id,
      recipe_id: recipeId,
      day_of_week: dayOfWeek,
      meal_type: mealType,
      scheduled_date: scheduledDate,
    })
    .select()
    .single();
  if (itemError) throw itemError;

  return item;
}

/**
 * Persist an AI-suggested recipe (not yet in DB) to the recipes table and return its id.
 */
export async function persistAiRecipe(params: {
  householdId: string;
  userId: string;
  recipe: {
    title: string;
    description?: string | null;
    prep_time?: number | null;
    cook_time?: number | null;
    servings?: number | null;
    difficulty?: "easy" | "medium" | "hard";
    cuisine_type?: string | null;
    ingredients?: any[];
    instructions?: any[];
    nutritional_info?: any;
  };
}) {
  const { householdId, userId, recipe } = params;
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      title: recipe.title,
      description: recipe.description || null,
      prep_time: recipe.prep_time || null,
      cook_time: recipe.cook_time || null,
      servings: recipe.servings || 4,
      difficulty: recipe.difficulty || "medium",
      cuisine_type: recipe.cuisine_type || null,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      nutritional_info: recipe.nutritional_info || null,
      tags: [],
      source: "ai_generated",
      household_id: householdId,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}