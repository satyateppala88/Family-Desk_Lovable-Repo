import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { householdId, mealPlanId, userId } = await req.json();
    
    if (!householdId || !mealPlanId || !userId) {
      return new Response(
        JSON.stringify({ error: "householdId, mealPlanId, and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch meal plan with recipes and ingredients
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from("meal_plans")
      .select(`
        *,
        items:meal_plan_items(
          *,
          recipe:recipes(
            title,
            ingredients
          )
        )
      `)
      .eq("id", mealPlanId)
      .single();

    if (mealPlanError) throw mealPlanError;

    // Fetch current pantry inventory
    const { data: pantryItems, error: pantryError } = await supabase
      .from("pantry_items")
      .select("name, quantity, unit")
      .eq("household_id", householdId);

    if (pantryError) throw pantryError;

    // Build pantry map for quick lookup
    const pantryMap = new Map();
    pantryItems?.forEach(item => {
      const key = item.name.toLowerCase().trim();
      pantryMap.set(key, { quantity: item.quantity || 0, unit: item.unit });
    });

    // Collect all ingredients from meal plan
    const neededIngredients = new Map<string, any>();
    
    mealPlan.items?.forEach((mealItem: any) => {
      const recipe = mealItem.recipe;
      if (!recipe?.ingredients) return;

      recipe.ingredients.forEach((ingredient: any) => {
        const name = ingredient.name.toLowerCase().trim();
        const qty = parseFloat(ingredient.quantity) || 0;
        const unit = ingredient.unit || "";

        if (neededIngredients.has(name)) {
          const existing = neededIngredients.get(name);
          existing.quantity += qty;
          existing.recipes.push(recipe.title);
        } else {
          neededIngredients.set(name, {
            name: ingredient.name,
            quantity: qty,
            unit,
            recipes: [recipe.title]
          });
        }
      });
    });

    // Compare with pantry and build shopping list
    const shoppingListItems: any[] = [];
    
    neededIngredients.forEach((needed, key) => {
      const inPantry = pantryMap.get(key);
      
      if (!inPantry || inPantry.quantity < needed.quantity) {
        const neededQty = inPantry 
          ? Math.max(0, needed.quantity - inPantry.quantity)
          : needed.quantity;
        
        shoppingListItems.push({
          name: needed.name,
          quantity: Math.ceil(neededQty * 10) / 10, // Round to 1 decimal
          unit: needed.unit,
          category: null,
          is_checked: false,
          pantry_item_id: null,
          recipe_source: needed.recipes.join(", ")
        });
      }
    });

    // Create shopping list
    const { data: createdList, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        household_id: householdId,
        name: `Shopping for Week of ${new Date(mealPlan.week_start_date).toLocaleDateString()}`,
        auto_generated: true,
        meal_plan_id: mealPlanId,
        created_by: userId,
      })
      .select()
      .single();

    if (listError) throw listError;

    // Add items to shopping list
    if (shoppingListItems.length > 0) {
      const itemsToInsert = shoppingListItems.map(item => ({
        ...item,
        list_id: createdList.id,
      }));

      const { error: itemsError } = await supabase
        .from("shopping_list_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return new Response(JSON.stringify({ 
      listId: createdList.id,
      itemCount: shoppingListItems.length,
      items: shoppingListItems
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating shopping list:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate shopping list" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
