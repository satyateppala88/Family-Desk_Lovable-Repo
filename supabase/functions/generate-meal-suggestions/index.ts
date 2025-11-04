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
    const { householdId, preferences, pantryItems, numDays = 7 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context about household preferences and pantry
    const preferencesText = preferences?.preferences 
      ? `Dietary restrictions: ${JSON.stringify(preferences.preferences)}`
      : "No specific dietary restrictions";
    
    const cuisineText = preferences?.cuisine_preferences?.length 
      ? `Preferred cuisines: ${preferences.cuisine_preferences.join(", ")}`
      : "Open to all cuisines";
    
    const pantryText = pantryItems?.length
      ? `Available pantry items: ${pantryItems.map((item: any) => item.name).join(", ")}`
      : "Pantry inventory not tracked";

    const systemPrompt = `You are a professional meal planning assistant. Generate a ${numDays}-day meal plan with breakfast, lunch, and dinner for each day.

Context:
- ${preferencesText}
- ${cuisineText}
- ${pantryText}

Requirements:
- Create balanced, nutritious meals
- Consider variety across days
- Include prep and cook times
- Suggest realistic, achievable recipes
- Take dietary restrictions seriously`;

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
                            }
                          },
                          required: ["title", "ingredients", "instructions", "prep_time", "cook_time"]
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
    
    return new Response(JSON.stringify(mealPlan), {
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
