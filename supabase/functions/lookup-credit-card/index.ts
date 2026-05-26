import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

const InputSchema = z.object({
  card_name: z.string().min(2).max(120),
  bank: z.string().min(1).max(80),
});

Deno.serve(async (req) => {
  const log = new Logger("lookup-credit-card");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.setContext({ userId: auth.user.id });

    const rate = checkRateLimit(auth.user.id, "lookup-credit-card", AI_RATE_LIMIT);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.errors.map((e) => e.message) }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { card_name, bank } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    log.info("Looking up card", { card_name, bank });

    const systemPrompt = `You are a credit card knowledge assistant for Indian banks.
Given a card name and bank, return your best knowledge of that card's published features.
Use commonly known public facts. If unsure about a number, give a reasonable estimate and lower confidence.
Return ONLY data via the provided tool.

Categories must use these keys: "all", "groceries", "dining_out", "transport", "entertainment", "utilities".
Networks: "Visa", "Mastercard", "RuPay", "Amex", "Diners".
Color: a hex color matching the bank's brand (e.g. HDFC #1a3a5c, SBI #003d82, ICICI #ff9900, Axis #2874f0).`;

    const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Look up details for: bank "${bank}", card "${card_name}".` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "card_details",
              description: "Structured credit card details",
              parameters: {
                type: "object",
                properties: {
                  found: { type: "boolean", description: "Whether you have reasonable knowledge of this card" },
                  name: { type: "string", description: "Official card name (e.g. 'Regalia Gold')" },
                  bank: { type: "string", description: "Issuing bank (e.g. 'HDFC')" },
                  network: { type: "string", enum: ["Visa", "Mastercard", "RuPay", "Amex", "Diners"] },
                  annual_fee: { type: "number", description: "Annual fee in INR (0 for lifetime free)" },
                  color: { type: "string", description: "Hex color for the card badge, e.g. #1a3a5c" },
                  benefits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["all", "groceries", "dining_out", "transport", "entertainment", "utilities"] },
                        type: { type: "string", enum: ["cashback", "reward_points"] },
                        value: { type: "number" },
                        description: { type: "string" },
                      },
                      required: ["category", "type", "value", "description"],
                    },
                  },
                  milestones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        threshold: { type: "number", description: "Spend threshold in INR" },
                        reward: { type: "string" },
                      },
                      required: ["threshold", "reward"],
                    },
                  },
                  perks: { type: "array", items: { type: "string" } },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["found", "name", "bank", "network", "annual_fee", "color", "benefits", "milestones", "perks", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "card_details" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      log.error("AI gateway error", { status: response.status, errText });
      throw new Error("Failed to look up card");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No valid response from AI");

    const card = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, card }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    if ((error as any)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "AI service timed out. Please try again." }), { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("lookup-credit-card error:", error);
    const message = error instanceof Error ? error.message : "Failed to look up card";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});