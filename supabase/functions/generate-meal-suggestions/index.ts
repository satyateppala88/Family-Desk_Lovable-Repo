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
    const { householdId, userId, numDays = 7, weekStartDate, generateFrom } = await req.json();
    
    if (!householdId || !userId) {
      throw new Error("householdId and userId are required");
    }

    // Calculate which day of the week to start from
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    let startDayIndex = 0; // Default to Sunday (0)

    if (generateFrom === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate days difference between today and week start
      const daysDiff = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      startDayIndex = Math.max(0, Math.min(6, daysDiff));
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDayName = dayNames[startDayIndex];
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    // Use service role key to bypass RLS for backend operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: householdPrefs } = await supabase
      .from("household_preferences")
      .select("*")
      .eq("household_id", householdId)
      .maybeSingle();
    
    const { data: hiddenRecipes } = await supabase
      .from("recipes")
      .select("title")
      .eq("household_id", householdId)
      .eq("hidden", true);

    // Build enhanced context from household preferences
    let familyContext = "Family of 2 adults";
    let dietContext = "No specific dietary restrictions";
    let cuisineContext = "Open to all Indian cuisines";
    let skillContext = "Intermediate cooking skill";
    let timeContext = "30-60 minutes available for cooking";
    let budgetContext = "Moderate budget consciousness";
    let allergyContext = "No known food allergies";
    
    if (householdPrefs) {
      const adults = householdPrefs.family_size_adults || 2;
      const children = householdPrefs.family_size_children || 0;
      familyContext = `Family of ${adults} adults${children > 0 ? ` and ${children} children` : ""}`;
      
      if (householdPrefs.diet_type) {
        dietContext = `Diet type: ${householdPrefs.diet_type.replace("_", " ")}`;
      }
      
      if (householdPrefs.food_allergies?.length) {
        allergyContext = `CRITICAL ALLERGIES - MUST AVOID: ${householdPrefs.food_allergies.join(", ")}`;
      }
      
      if (householdPrefs.religious_restrictions && householdPrefs.religious_restrictions !== "none") {
        dietContext += ` with ${householdPrefs.religious_restrictions} dietary restrictions`;
      }
      
      if (householdPrefs.regional_cuisines?.length) {
        cuisineContext = `Preferred cuisines: ${householdPrefs.regional_cuisines.join(", ")}`;
      }
      
      if (householdPrefs.cooking_skill_level) {
        skillContext = `Cooking skill: ${householdPrefs.cooking_skill_level}`;
      }
      
      if (householdPrefs.weekday_cooking_time) {
        const timeMap: any = {
          "less_than_30": "Less than 30 minutes",
          "30_to_60": "30-60 minutes",
          "more_than_60": "More than 60 minutes"
        };
        timeContext = `Available cooking time: ${timeMap[householdPrefs.weekday_cooking_time] || "flexible"}`;
      }
      
      if (householdPrefs.budget_consciousness) {
        budgetContext = `Budget: ${householdPrefs.budget_consciousness.replace("_", " ")} conscious`;
      }
    }
    
    const hiddenRecipeNames = hiddenRecipes?.map(r => r.title) || [];
    const hiddenRecipeText = hiddenRecipeNames.length > 0 
      ? `NEVER suggest these recipes (user has hidden them): ${hiddenRecipeNames.join(", ")}`
      : "";

    const systemPrompt = `You are a professional Indian meal planning assistant. Generate a ${numDays}-day meal plan featuring authentic Indian cuisine with breakfast, lunch, and dinner for each day.

MEAL GENERATION INSTRUCTIONS:
- Generate meals for ${numDays} consecutive days starting from day ${startDayIndex} (${startDayName})
- Day 0 = Sunday, Day 1 = Monday, Day 2 = Tuesday, Day 3 = Wednesday, Day 4 = Thursday, Day 5 = Friday, Day 6 = Saturday
- Start generating meals from day ${startDayIndex} and continue for ${numDays} days
- Each meal MUST have the correct day_of_week number (starting from ${startDayIndex})
- Example: If starting from day 3 (Wednesday), the first meal should be day: 3, second meal day: 3, etc., then day 4, 5, 6...

HOUSEHOLD PROFILE:
- ${familyContext}
- ${dietContext}
- ${allergyContext}
- ${cuisineContext}
- ${skillContext}
- ${timeContext}
- ${budgetContext}
${hiddenRecipeText ? `\n${hiddenRecipeText}` : ""}

Regional Context for India:
- Focus exclusively on Indian recipes and cooking styles
- Use commonly available Indian ingredients and spices
- Consider Indian dietary preferences (vegetarian, non-vegetarian, Jain, vegan)
- Include popular regional cuisines: North Indian, South Indian, Bengali, Maharashtrian, Gujarati, Punjabi, Rajasthani, etc.
- Use metric measurements (grams, kilograms, milliliters, liters, cups, tablespoons, teaspoons)
- Consider seasonal availability of ingredients in India

Common Indian Pantry Staples to Consider:
- Spices: turmeric (haldi), cumin (jeera), coriander (dhania), garam masala, red chili powder, black pepper, cardamom, cloves, cinnamon
- Grains: basmati rice, sona masoori rice, wheat flour (atta), maida, rava/sooji (semolina), poha, vermicelli
- Legumes: moong dal, toor dal, chana dal, masoor dal, urad dal, rajma, chickpeas (kabuli chana), black-eyed peas
- Staples: ghee, mustard oil, coconut oil, refined oil, yogurt/curd, paneer, milk
- Basics: onions, tomatoes, ginger, garlic, green chilies, curry leaves, coriander leaves

Indian Meal Structure:
- Breakfast: Include options like poha, upma, dosa, idli, paratha, poori-bhaji, sandwich, uttapam, dhokla, etc.
- Lunch: Typically includes dal, sabzi (vegetable curry), rice, roti/chapati, raita, salad
- Dinner: Similar to lunch but can be lighter; include dal, sabzi, rice/roti combinations, sometimes one-pot meals

Requirements:
- Create balanced, nutritious Indian meals
- Ensure variety across days with different regional cuisines
- Include realistic prep time and cook time for Indian households
- Consider cooking methods: tadka, pressure cooking, tawa cooking, steaming, deep frying
- Provide servings suitable for Indian families (typically 4 servings)
- Take dietary restrictions very seriously
- Include both simple everyday meals and some special dishes
- Balance between time-intensive and quick meals

CRITICAL - NUTRITIONAL INFORMATION:
Each recipe MUST include detailed nutritional information per serving:
- calories (required): Total calories per serving
- protein: Grams of protein per serving  
- carbs: Grams of carbohydrates per serving
- fat: Grams of fat per serving
Calculate nutritional values based on the ingredients and their quantities.
Example: If a recipe serves 4, calculate the nutritional info for 1/4 of the total ingredients.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Generate ${numDays} days of meal suggestions (breakfast, lunch, dinner) as a meal plan.` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_meal_plan",
              description: "Generate a structured meal plan with recipes",
              parameters: {
                type: "object",
                properties: {
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "integer", description: "Day number (0-6 for week)" },
                        meal_type: { 
                          type: "string", 
                          enum: ["breakfast", "lunch", "dinner"],
                          description: "Type of meal"
                        },
                        recipe: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            prep_time: { type: "integer", description: "Minutes" },
                            cook_time: { type: "integer", description: "Minutes" },
                            servings: { type: "integer" },
                            difficulty: { 
                              type: "string", 
                              enum: ["easy", "medium", "hard"] 
                            },
                            cuisine_type: { type: "string" },
                            ingredients: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  name: { type: "string" },
                                  quantity: { type: "string" },
                                  unit: { type: "string" }
                                },
                                required: ["name", "quantity"]
                              }
                            },
                            instructions: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  step: { type: "integer" },
                                  instruction: { type: "string" }
                                },
                                required: ["step", "instruction"]
                              }
                            },
                            nutritional_info: {
                              type: "object",
                              description: "Nutritional information per serving",
                              properties: {
                                calories: { 
                                  type: "number",
                                  description: "Total calories per serving"
                                },
                                protein: { 
                                  type: "number",
                                  description: "Grams of protein per serving"
                                },
                                carbs: { 
                                  type: "number",
                                  description: "Grams of carbohydrates per serving"
                                },
                                fat: { 
                                  type: "number",
                                  description: "Grams of fat per serving"
                                }
                              },
                              required: ["calories"]
                            }
                          },
                          required: ["title", "ingredients", "instructions", "prep_time", "cook_time", "nutritional_info"]
                        }
                      },
                      required: ["day", "meal_type", "recipe"]
                    }
                  }
                },
                required: ["meals"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_meal_plan" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway request failed");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    // Extract the tool call response
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const mealPlan = JSON.parse(toolCall.function.arguments);
    
    // Create meal plan entry in database
    const { data: createdPlan, error: planError } = await supabase
      .from("meal_plans")
      .insert({
        household_id: householdId,
        week_start_date: weekStartDate || new Date().toISOString().split('T')[0],
        created_by: userId,
      })
      .select()
      .single();

    if (planError) {
      console.error("Error creating meal plan:", planError);
      throw new Error("Failed to create meal plan in database");
    }

    console.log("Created meal plan:", createdPlan.id);

    // Create recipes and meal plan items
    const createdRecipes = [];
    for (let i = 0; i < mealPlan.meals.length; i++) {
      const meal = mealPlan.meals[i];
      
      try {
        // Insert recipe
        const { data: recipe, error: recipeError } = await supabase
          .from("recipes")
          .insert({
            title: meal.recipe.title,
            description: meal.recipe.description || null,
            prep_time: meal.recipe.prep_time || null,
            cook_time: meal.recipe.cook_time || null,
            servings: meal.recipe.servings || 4,
            difficulty: meal.recipe.difficulty || 'medium',
            cuisine_type: meal.recipe.cuisine_type || 'Indian',
            ingredients: meal.recipe.ingredients || [],
            instructions: meal.recipe.instructions || [],
            nutritional_info: meal.recipe.nutritional_info || null,
            tags: meal.recipe.tags || [],
            household_id: householdId,
            created_by: userId,
            source: 'ai_generated',
            is_favorite: false,
          })
          .select()
          .single();

        if (recipeError) {
          console.error(`Error creating recipe ${i}:`, recipeError);
          continue;
        }

        createdRecipes.push(recipe);

        // Insert meal plan item
        const dayIndex = meal.day;
        const mealType = meal.meal_type;

        // Calculate the actual scheduled date for this meal
        const scheduledDate = new Date(weekStartDate);
        scheduledDate.setDate(scheduledDate.getDate() + dayIndex);

        const { error: itemError } = await supabase
          .from("meal_plan_items")
          .insert({
            meal_plan_id: createdPlan.id,
            recipe_id: recipe.id,
            day_of_week: dayIndex,
            meal_type: mealType,
            scheduled_date: scheduledDate.toISOString().split('T')[0],
          });

        if (itemError) {
          console.error(`Error creating meal plan item ${i}:`, itemError);
        }
      } catch (err) {
        console.error(`Error processing meal ${i}:`, err);
        continue;
      }
    }

    console.log(`Successfully created ${createdRecipes.length} recipes and meal plan items`);
    
    return new Response(JSON.stringify({ 
      mealPlanId: createdPlan.id,
      meals: mealPlan.meals,
      recipesCreated: createdRecipes.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating meal suggestions:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate meal suggestions" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
