import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, AI_HEAVY_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

// Input validation schema
const RegenerateMealsSchema = z.object({
  householdId: z.string().uuid("Invalid household ID format"),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)"),
  dayOfWeek: z.number().int().min(0, "Day of week must be 0-6").max(6, "Day of week must be 0-6"),
  mealType: z.enum(["breakfast", "lunch", "dinner"]).optional()
});

Deno.serve(async (req) => {
  const log = new Logger("regenerate-meals");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = RegenerateMealsSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { householdId, weekStartDate, dayOfWeek, mealType } = validationResult.data;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch household preferences
    const { data: preferences } = await supabaseAdmin
      .from("household_preferences")
      .select("*")
      .eq("household_id", householdId)
      .single();

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      log.warn("Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.setContext({ userId: user.id, householdId });

    // Rate limiting
    const rateCheck = checkRateLimit(user.id, "regenerate-meals", AI_HEAVY_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) },
      });
    }

    // Determine meal types to regenerate
    const mealTypes = mealType ? [mealType] : ["breakfast", "lunch", "dinner"];
    const numMeals = mealTypes.length;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = dayNames[dayOfWeek];

    // Build AI prompt
    const dietInfo = preferences?.diet_type ? `Diet: ${preferences.diet_type}` : '';
    const allergiesInfo = preferences?.food_allergies?.length ? `Allergies: ${preferences.food_allergies.join(', ')}` : '';
    const spiceInfo = preferences?.spice_level ? `Spice level: ${preferences.spice_level}` : '';
    const cuisineInfo = preferences?.regional_cuisines?.length ? `Preferred cuisines: ${preferences.regional_cuisines.join(', ')}` : '';

    const systemPrompt = `You are a meal planning assistant. Generate ${numMeals} meal(s) for ${targetDay}.

Household preferences:
${dietInfo}
${allergiesInfo}
${spiceInfo}
${cuisineInfo}

CRITICAL: Each recipe MUST include detailed nutritional information per serving:
- calories (required): Total calories per serving
- protein: Grams of protein per serving
- carbs: Grams of carbohydrates per serving
- fat: Grams of fat per serving

Generate creative, varied meals that are different from what the user might already have.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${numMeals} meal(s) for ${mealTypes.join(', ')}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_meals",
              description: `Generate ${numMeals} meal(s) with complete recipe details`,
              parameters: {
                type: "object",
                properties: {
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner"] },
                        prep_time: { type: "number" },
                        cook_time: { type: "number" },
                        servings: { type: "number" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        cuisine_type: { type: "string" },
                        ingredients: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              amount: { type: "string" },
                              unit: { type: "string" }
                            },
                            required: ["name", "amount"]
                          }
                        },
                        instructions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              step: { type: "number" },
                              instruction: { type: "string" }
                            },
                            required: ["step", "instruction"]
                          }
                        },
                        nutritional_info: {
                          type: "object",
                          properties: {
                            calories: { type: "number" },
                            protein: { type: "number" },
                            carbs: { type: "number" },
                            fat: { type: "number" }
                          },
                          required: ["calories"]
                        },
                        tags: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["title", "description", "meal_type", "prep_time", "cook_time", "servings", "ingredients", "instructions", "nutritional_info"]
                    }
                  }
                },
                required: ["meals"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_meals" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const mealsData = JSON.parse(toolCall.function.arguments);

    // Get or create meal plan for this week
    let { data: mealPlan } = await supabaseAdmin
      .from("meal_plans")
      .select("id")
      .eq("household_id", householdId)
      .eq("week_start_date", weekStartDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!mealPlan) {
      const { data: newPlan, error: planError } = await supabaseAdmin
        .from("meal_plans")
        .insert({
          household_id: householdId,
          week_start_date: weekStartDate,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (planError || !newPlan) {
        throw new Error("Failed to create meal plan");
      }
      mealPlan = newPlan;
    }

    const createdRecipes = [];

    for (const meal of mealsData.meals) {
      // Create recipe
      const { data: recipe, error: recipeError } = await supabaseAdmin
        .from("recipes")
        .insert({
          household_id: householdId,
          created_by: user.id,
          title: meal.title,
          description: meal.description,
          prep_time: meal.prep_time,
          cook_time: meal.cook_time,
          servings: meal.servings,
          difficulty: meal.difficulty || "medium",
          cuisine_type: meal.cuisine_type,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          nutritional_info: meal.nutritional_info,
          tags: meal.tags || [],
          source: "ai_generated",
        })
        .select()
        .single();

      if (recipeError) {
        console.error("Error creating recipe:", recipeError);
        continue;
      }

      // Calculate scheduled date
      const scheduledDate = new Date(weekStartDate);
      scheduledDate.setDate(scheduledDate.getDate() + dayOfWeek);

      // Check if meal plan item exists for this slot
      const { data: existingItem } = await supabaseAdmin
        .from("meal_plan_items")
        .select("id")
        .eq("meal_plan_id", mealPlan!.id)
        .eq("day_of_week", dayOfWeek)
        .eq("meal_type", meal.meal_type)
        .single();

      if (existingItem) {
        // Update existing item
        await supabaseAdmin
          .from("meal_plan_items")
          .update({
            recipe_id: recipe.id,
            scheduled_date: scheduledDate.toISOString().split('T')[0],
          })
          .eq("id", existingItem.id);
      } else {
        // Create new item
        await supabaseAdmin
          .from("meal_plan_items")
          .insert({
            meal_plan_id: mealPlan!.id,
            recipe_id: recipe.id,
            day_of_week: dayOfWeek,
            meal_type: meal.meal_type,
            scheduled_date: scheduledDate.toISOString().split('T')[0],
          });
      }

      createdRecipes.push(recipe);
    }

    console.log(`Successfully regenerated ${createdRecipes.length} meal(s) for ${targetDay}`);

    return new Response(JSON.stringify({ success: true, recipes: createdRecipes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in regenerate-meals:", error);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
