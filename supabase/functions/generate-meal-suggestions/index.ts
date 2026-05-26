import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { checkRateLimit, AI_HEAVY_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

// Input validation schema
const GenerateMealSuggestionsSchema = z.object({
  householdId: z.string().uuid("Invalid household ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  numDays: z.number().int().min(1).max(30).optional().default(7),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)"),
  generateFrom: z.enum(["start", "today"]).optional()
});

Deno.serve(async (req) => {
  const log = new Logger("generate-meal-suggestions");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const auth = await authenticateRequest(req);
    if (!auth) {
      log.warn("Unauthorized request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    log.setContext({ userId: auth.user.id });

    // Rate limiting
    const rateCheck = checkRateLimit(auth.user.id, "generate-meal-suggestions", AI_HEAVY_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          } 
        }
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = GenerateMealSuggestionsSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      log.warn("Validation error", { errors: validationResult.error.errors });
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { householdId, userId, numDays, weekStartDate, generateFrom } = validationResult.data;
    log.setContext({ userId: auth.user.id, householdId });

    // Verify household membership
    const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, householdId);
    if (!isMember) {
      log.warn("Not a household member");
      return new Response(
        JSON.stringify({ error: "Not a member of this household" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate which day of the week to start from
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    let startDayIndex = 0;

    if (generateFrom === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      startDayIndex = Math.max(0, Math.min(6, daysDiff));
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDayName = dayNames[startDayIndex];
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use the authenticated supabase client (service role) for data fetching
    const supabase = auth.supabase;

    const [
      { data: householdPrefs },
      { data: hiddenRecipes },
      { data: pantryItems },
      { data: recentMeals },
      { data: topRatedRecipes },
    ] = await Promise.all([
      supabase.from("household_preferences").select("*").eq("household_id", householdId).maybeSingle(),
      supabase.from("recipes").select("title").eq("household_id", householdId).eq("hidden", true),
      supabase.from("pantry_items").select("name, quantity, unit, category, expiry_date")
        .eq("household_id", householdId).order("category", { ascending: true }),

      // NEW: recipes planned/cooked in last 14 days
      supabase.from("meal_plan_items")
        .select("recipes!inner(title), scheduled_date")
        .gte("scheduled_date", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
        .not("recipes", "is", null),

      // NEW: top-rated recipes
      supabase.from("recipe_ratings")
        .select("rating, recipes!inner(title, household_id)")
        .eq("recipes.household_id", householdId)
        .gte("rating", 4)
        .order("rating", { ascending: false })
        .limit(15),
    ]);

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
    
    const hiddenRecipeNames = hiddenRecipes?.map((r: any) => r.title) || [];
    const hiddenRecipeText = hiddenRecipeNames.length > 0
      ? `NEVER suggest these recipes (user has hidden them): ${hiddenRecipeNames.join(", ")}`
      : "";

    const recentTitles = [...new Set(
      (recentMeals || []).map((m: any) => m.recipes?.title).filter(Boolean)
    )];
    const recentText = recentTitles.length
      ? `\nRECENTLY COOKED (avoid suggesting these — cooked in last 14 days): ${recentTitles.join(", ")}`
      : "";

    const topRatedTitles = (topRatedRecipes || [])
      .map((r: any) => `${r.recipes?.title} (${r.rating}★)`).filter(Boolean);
    const ratedText = topRatedTitles.length
      ? `\nFAMILY FAVOURITES (prefer suggesting these when appropriate): ${topRatedTitles.join(", ")}`
      : "";

    // Build pantry inventory context
    let pantryContext = "";
    if (pantryItems && pantryItems.length > 0) {
      const itemsByCategory: Record<string, any[]> = {};
      pantryItems.forEach(item => {
        const category = item.category || "Other";
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        
        let expiryNote = "";
        if (item.expiry_date) {
          const expiryDate = new Date(item.expiry_date);
          const today = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            expiryNote = ` (expiring in ${daysUntilExpiry} days - PRIORITIZE)`;
          } else if (daysUntilExpiry <= 0) {
            expiryNote = " (expired - DO NOT USE)";
          }
        }
        
        const qtyText = item.quantity && item.unit 
          ? `${item.quantity} ${item.unit}` 
          : item.quantity 
            ? `${item.quantity}` 
            : "available";
        
        itemsByCategory[category].push(`${item.name} (${qtyText})${expiryNote}`);
      });

      pantryContext = "\n\nCURRENT PANTRY INVENTORY:\n";
      pantryContext += "IMPORTANT: Prioritize using ingredients from the pantry, especially items marked as expiring soon.\n";
      pantryContext += "Try to incorporate pantry items into recipes to reduce waste and save money.\n\n";
      
      Object.entries(itemsByCategory).forEach(([category, items]) => {
        pantryContext += `${category}:\n`;
        items.forEach(item => {
          pantryContext += `  - ${item}\n`;
        });
        pantryContext += "\n";
      });
    } else {
      pantryContext = "\n\nNote: No pantry inventory data available. Generate meals using commonly available Indian ingredients.";
    }

    const systemPrompt = `You are a professional Indian meal planning assistant. Generate a ${numDays}-day meal plan featuring authentic Indian cuisine with breakfast, lunch, dinner, and one snack for each day.

MEAL GENERATION INSTRUCTIONS:
- Generate meals for ${numDays} consecutive days starting from day ${startDayIndex} (${startDayName})
- Day 0 = Sunday, Day 1 = Monday, Day 2 = Tuesday, Day 3 = Wednesday, Day 4 = Thursday, Day 5 = Friday, Day 6 = Saturday
- Start generating meals from day ${startDayIndex} and continue for ${numDays} days
- Each meal MUST have the correct day_of_week number (starting from ${startDayIndex})
- Example: If starting from day 3 (Wednesday), the first meal should be day: 3, second meal day: 3, etc., then day 4, 5, 6...
- For each day, output exactly 4 meals: breakfast, lunch, dinner, and snack.

HOUSEHOLD PROFILE:
- ${familyContext}
- ${dietContext}
- ${allergyContext}
- ${cuisineContext}
- ${skillContext}
- ${timeContext}
- ${budgetContext}
    ${hiddenRecipeText ? `\n${hiddenRecipeText}` : ""}
    ${recentText}
    ${ratedText}
    ${pantryContext}

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
- Snack: One light item per day, typically eaten around 4-5pm. Examples: poha, upma, samosa, pakoda, chivda, fruit chaat, roasted makhana, or chai with biscuits. Keep it light and realistic.

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

    log.info("Calling AI gateway for meal suggestions", { numDays, startDayIndex });

    const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Generate ${numDays} days of meal suggestions (breakfast, lunch, dinner, snack) as a meal plan.` 
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
                          enum: ["breakfast", "lunch", "dinner", "snack"],
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
                                calories: { type: "number", description: "Total calories per serving" },
                                protein: { type: "number", description: "Grams of protein per serving" },
                                carbs: { type: "number", description: "Grams of carbohydrates per serving" },
                                fat: { type: "number", description: "Grams of fat per serving" }
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
        log.warn("AI gateway rate limit");
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
      log.error("AI gateway error", new Error(errorText), { status: response.status });
      throw new Error("AI gateway request failed");
    }

    const data = await response.json();
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
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (planError) {
      log.error("Error creating meal plan", planError);
      throw new Error("Failed to create meal plan in database");
    }

    log.info("Created meal plan", { planId: createdPlan.id });

    // Create recipes and meal plan items
    const createdRecipes = [];
    for (let i = 0; i < mealPlan.meals.length; i++) {
      const meal = mealPlan.meals[i];
      
      try {
        const { data: recipe, error: recipeError } = await supabase
          .from("recipes")
          .insert({
            title: meal.recipe.title,
            description: meal.recipe.description || null,
            prep_time: meal.recipe.prep_time || null,
            cook_time: meal.recipe.cook_time || null,
            servings: meal.recipe.servings || 4,
            difficulty: meal.recipe.difficulty || "medium",
            cuisine_type: meal.recipe.cuisine_type || null,
            ingredients: meal.recipe.ingredients || [],
            instructions: meal.recipe.instructions || [],
            nutritional_info: meal.recipe.nutritional_info || null,
            tags: [],
            source: "ai_generated",
            household_id: householdId,
            created_by: auth.user.id,
          })
          .select()
          .single();

        if (recipeError) {
          log.error("Error creating recipe", recipeError, { mealIndex: i });
          continue;
        }

        // Calculate scheduled date
        const scheduledDate = new Date(weekStartDate);
        scheduledDate.setDate(scheduledDate.getDate() + meal.day);

        const { error: itemError } = await supabase
          .from("meal_plan_items")
          .insert({
            meal_plan_id: createdPlan.id,
            recipe_id: recipe.id,
            day_of_week: meal.day,
            meal_type: meal.meal_type,
            scheduled_date: scheduledDate.toISOString().split('T')[0],
          });

        if (itemError) {
          log.error("Error creating meal plan item", itemError);
        }

        createdRecipes.push(recipe);
      } catch (err) {
        log.error("Error processing meal", err, { mealIndex: i });
      }
    }

    log.info("Meal generation complete", { recipesCreated: createdRecipes.length });
    log.done(200);

    return new Response(JSON.stringify({ 
      mealPlanId: createdPlan.id,
      recipes: createdRecipes 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    if ((error as any)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "AI service timed out. Please try again." }), { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log.error("Error in generate-meal-suggestions", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate meals" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
