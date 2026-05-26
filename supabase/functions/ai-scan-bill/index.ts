import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";

const MAX_IMAGES = 5;
// ~6MB base64 string ≈ ~4.5MB binary. Generous ceiling per image.
const MAX_IMAGE_CHARS = 8_000_000;

const ScanBillSchema = z.object({
  // Each image is a data URL: "data:image/jpeg;base64,...."
  images: z.array(z.string().min(20).max(MAX_IMAGE_CHARS))
    .min(1, "At least one image is required")
    .max(MAX_IMAGES, `Maximum ${MAX_IMAGES} images per scan`),
  householdId: z.string().uuid("Invalid household ID").optional(),
});

Deno.serve(async (req) => {
  const log = new Logger("ai-scan-bill");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    log.setContext({ userId: auth.user.id });

    const rateCheck = checkRateLimit(auth.user.id, "ai-scan-bill", AI_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const parsed = ScanBillSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.errors.map(e => e.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { images, householdId } = parsed.data;

    if (householdId) {
      log.setContext({ userId: auth.user.id, householdId });
      const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, householdId);
      if (!isMember) {
        return new Response(
          JSON.stringify({ error: "Not a member of this household" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a grocery bill OCR + structuring assistant for Indian households.

You will receive one or more photos of printed or handwritten grocery/supermarket bills (e.g. DMart, Reliance Fresh, BigBasket, local kirana). Extract every line item and return a single consolidated, deduplicated list across all images.

Rules:
- Standardize item names in Title Case English. Translate colloquial Indian terms (atta -> Wheat Flour, haldi -> Turmeric Powder, dhania -> Coriander).
- Quantity must be numeric. Parse units from the line (kg, g, L, ml, pcs, packets, bottles, dozen). If a count line lacks a unit, default unit to "pcs".
- If the same item appears across multiple images or rows, sum the quantities (only when the unit matches; otherwise keep separate rows).
- Categories MUST be one of: Grains & Lentils, Spices & Masalas, Dairy & Eggs, Vegetables, Fruits, Oils & Ghee, Snacks & Packaged Foods, Beverages, Frozen Items, Other.
- expiry_days: estimate days from today until likely expiry. Vegetables 5-7, fruits 4-7, dairy 7-14, bread 4-5, eggs 21, frozen 60, packaged 180, spices 365, grains 365, oils 365. Use 0 for non-perishables you are unsure about.
- unit_price: per-unit price in INR if visible, else omit.
- confidence: 0-1. Use < 0.6 for blurry/unclear lines so the user can review.
- Skip taxes, totals, discounts, delivery fees, tip lines, and anything that is not a purchasable item.
- bill_date: ISO yyyy-mm-dd if visible on the bill, else omit.
- store: store/shop name if printed, else omit.
- currency: 3-letter code, default "INR".`;

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Extract all grocery items from these ${images.length} bill image(s). Merge duplicates across images.`,
      },
      ...images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    log.info("Calling AI gateway", { imageCount: images.length });

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
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_bill",
              description: "Extract structured grocery bill data from images",
              parameters: {
                type: "object",
                properties: {
                  store: { type: "string" },
                  bill_date: { type: "string", description: "ISO yyyy-mm-dd" },
                  currency: { type: "string", description: "ISO 4217 code, default INR" },
                  total: { type: "number", description: "Bill total if visible" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                        category: { type: "string" },
                        expiry_days: { type: "number" },
                        unit_price: { type: "number" },
                        confidence: { type: "number" },
                      },
                      required: ["name", "quantity", "unit", "category", "expiry_days", "confidence"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_bill" } },
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
      log.error("AI gateway error", new Error(errorText), { status: response.status });
      throw new Error("AI gateway request failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    log.info("Bill scan complete", { itemCount: result.items?.length });
    log.done(200);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    log.error("Error in ai-scan-bill", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: error.message || "Failed to scan bill" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});