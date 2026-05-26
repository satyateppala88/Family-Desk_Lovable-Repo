import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Verify authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user token
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { householdId, mealPlanId } = await req.json();
    
    if (!householdId || !mealPlanId) {
      return new Response(
        JSON.stringify({ error: "householdId and mealPlanId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is a member of the household
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - not a member of this household" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      .eq("household_id", householdId)
      .single();

    if (mealPlanError) {
      if (mealPlanError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Meal plan not found or not accessible" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw mealPlanError;
    }

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

    // Create shopping list - use authenticated user's ID
    const { data: createdList, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        household_id: householdId,
        name: `Shopping for Week of ${new Date(mealPlan.week_start_date).toLocaleDateString()}`,
        auto_generated: true,
        meal_plan_id: mealPlanId,
        created_by: user.id,
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
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
