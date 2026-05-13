import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";

const Schema = z.object({
  householdId: z.string().uuid(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  count: z.number().int().min(1).max(5).optional().default(3),
});

serve(async (req) => {
  const log = new Logger("suggest-meals-for-slot");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.setContext({ userId: auth.user.id });

    const rate = checkRateLimit(auth.user.id, "suggest-meals-for-slot", AI_RATE_LIMIT);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) },
      });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.errors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { householdId, mealType, count } = parsed.data;
    log.setContext({ userId: auth.user.id, householdId });

    const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, householdId);
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = auth.supabase;
    const { data: prefs } = await supabase
      .from("household_preferences").select("*").eq("household_id", householdId).maybeSingle();
    const { data: pantry } = await supabase
      .from("pantry_items").select("name, quantity, unit, category, expiry_date")
      .eq("household_id", householdId);
    const { data: hidden } = await supabase
      .from("recipes").select("title").eq("household_id", householdId).eq("hidden", true);

    const family = prefs ? `${prefs.family_size_adults || 2} adults${prefs.family_size_children ? ` and ${prefs.family_size_children} children` : ""}` : "2 adults";
    const diet = prefs?.diet_type ? `Diet: ${String(prefs.diet_type).replace("_", " ")}` : "No specific diet";
    const allergies = prefs?.food_allergies?.length ? `MUST AVOID: ${prefs.food_allergies.join(", ")}` : "";
    const cuisines = prefs?.regional_cuisines?.length ? `Preferred cuisines: ${prefs.regional_cuisines.join(", ")}` : "Indian cuisines";
    const skill = prefs?.cooking_skill_level ? `Cooking skill: ${prefs.cooking_skill_level}` : "";
    const hiddenText = hidden?.length ? `Never suggest: ${hidden.map((h: any) => h.title).join(", ")}` : "";

    let pantryText = "";
    if (pantry?.length) {
      pantryText = "Available pantry items: " + pantry.slice(0, 40).map((p: any) =>
        `${p.name}${p.quantity ? ` (${p.quantity}${p.unit ? " " + p.unit : ""})` : ""}`
      ).join(", ");
    }

    const systemPrompt = `You are an Indian meal planning assistant. Suggest ${count} different ${mealType} options for tonight.

HOUSEHOLD: ${family}. ${diet}. ${allergies}
${cuisines}. ${skill}
${hiddenText}
${pantryText ? "\n" + pantryText + "\n\nPrioritize recipes that use available pantry items." : ""}

Return exactly ${count} distinct ${mealType} suggestions. Each suggestion should be quick to scan: short title, realistic prep+cook time, and the 4-6 most important ingredients.`;

    log.info("Calling AI gateway", { mealType, count });
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Suggest ${count} ${mealType} options for tonight.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_meals",
            description: "Return meal suggestions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      prep_time: { type: "integer" },
                      cook_time: { type: "integer" },
                      servings: { type: "integer" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      cuisine_type: { type: "string" },
                      ingredients: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            quantity: { type: "string" },
                            unit: { type: "string" },
                          },
                          required: ["name", "quantity"],
                        },
                      },
                      instructions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            step: { type: "integer" },
                            instruction: { type: "string" },
                          },
                          required: ["step", "instruction"],
                        },
                      },
                      nutritional_info: {
                        type: "object",
                        properties: {
                          calories: { type: "number" },
                          protein: { type: "number" },
                          carbs: { type: "number" },
                          fat: { type: "number" },
                        },
                      },
                    },
                    required: ["title", "ingredients", "prep_time", "cook_time"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_meals" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI is busy right now. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiResp.text();
      log.error("AI gateway error", new Error(t), { status: aiResp.status });
      throw new Error("AI gateway request failed");
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No suggestions returned");
    const args = JSON.parse(toolCall.function.arguments);
    const suggestions = (args.suggestions || []).slice(0, count);

    log.done(200);
    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log.error("suggest-meals-for-slot failed", e);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(JSON.stringify({ error: e.message || "Failed to suggest meals" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});