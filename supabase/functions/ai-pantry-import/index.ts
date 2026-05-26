import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";

// Input validation schema
const MAX_INPUT_LENGTH = 2000;

const PantryImportSchema = z.object({
  userInput: z.string()
    .min(1, "Input is required")
    .max(MAX_INPUT_LENGTH, `Input must be less than ${MAX_INPUT_LENGTH} characters`),
  householdId: z.string().uuid("Invalid household ID").optional(),
});

serve(async (req) => {
  const log = new Logger("ai-pantry-import");
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
    const rateCheck = checkRateLimit(auth.user.id, "ai-pantry-import", AI_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded", { remaining: rateCheck.remaining });
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
    const validationResult = PantryImportSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.errors });
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors.map(e => e.message)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userInput, householdId } = validationResult.data;

    // Verify household membership if householdId provided
    if (householdId) {
      log.setContext({ userId: auth.user.id, householdId });
      const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, householdId);
      if (!isMember) {
        log.warn("Not a household member");
        return new Response(
          JSON.stringify({ error: "Not a member of this household" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a pantry inventory assistant for Indian households. Extract structured pantry items from natural language descriptions.

Guidelines:
- Parse quantities and units (kg, g, L, ml, pcs, packets, bottles, etc.)
- Identify categories: Grains & Lentils, Spices & Masalas, Dairy & Eggs, Vegetables, Fruits, Oils & Ghee, Snacks & Packaged Foods, Beverages, Frozen Items, Other
- Estimate expiry days based on item type (e.g., vegetables: 5-7 days, spices: 365+ days, dairy: 7-14 days)
- Handle colloquial Indian terms (e.g., "atta" = "Wheat Flour", "haldi" = "Turmeric")
- If quantity is vague (e.g., "some", "a few"), default to 1 with appropriate unit`;

    log.info("Calling AI gateway");

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
          { role: "user", content: userInput }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pantry_items",
              description: "Extract structured pantry items from natural language",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Item name in English" },
                        quantity: { type: "number", description: "Numeric quantity" },
                        unit: { type: "string", description: "Unit of measurement" },
                        category: { type: "string", description: "Item category" },
                        expiry_days: { 
                          type: "number", 
                          description: "Estimated days until expiry (0 if non-perishable)" 
                        }
                      },
                      required: ["name", "quantity", "unit", "category", "expiry_days"]
                    }
                  }
                },
                required: ["items"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_pantry_items" } }
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

    const result = JSON.parse(toolCall.function.arguments);
    log.info("Pantry import complete", { itemCount: result.items?.length });
    log.done(200);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    log.error("Error in ai-pantry-import", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
