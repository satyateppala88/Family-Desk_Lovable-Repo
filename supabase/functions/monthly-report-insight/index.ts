import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

const CategoryDelta = z.object({
  label: z.string(),
  current: z.number(),
  previous: z.number(),
});

const Schema = z.object({
  householdId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  monthLabel: z.string(),
  prevMonthLabel: z.string(),
  currentSpent: z.number(),
  previousSpent: z.number(),
  currentSaved: z.number(),
  previousSaved: z.number(),
  topCategoryDeltas: z.array(CategoryDelta).max(5),
});

Deno.serve(async (req) => {
  const log = new Logger("monthly-report-insight");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.setContext({ userId: auth.user.id });

    const rate = checkRateLimit(auth.user.id, "monthly-report-insight", AI_RATE_LIMIT);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const p = parsed.data;

    const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, p.householdId);
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are FamilyDesk's finance analyst. Write ONE concise, factual sentence (max 160 chars) summarising how an Indian household's spending changed this month compared to last month. Reference the biggest driver category if it stands out. No emoji, no quotes, no preachy advice — just the insight.`;

    const catLines = p.topCategoryDeltas
      .map((c) => `- ${c.label}: ₹${Math.round(c.current)} vs ₹${Math.round(c.previous)} last month`)
      .join("\n");

    const userPrompt = `Current month: ${p.monthLabel}
Previous month: ${p.prevMonthLabel}
Total spent: ₹${Math.round(p.currentSpent)} (prev ₹${Math.round(p.previousSpent)})
Total saved: ₹${Math.round(p.currentSaved)} (prev ₹${Math.round(p.previousSaved)})
Top category changes:
${catLines || "- (no category data)"}

Write the one-sentence insight now.`;

    const aiRes = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      log.error("AI gateway error", { status: aiRes.status, body: t });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    let insight: string = data?.choices?.[0]?.message?.content?.trim() || "";
    insight = insight.replace(/^["“”']+|["“”']+$/g, "").trim();
    if (insight.length > 220) insight = insight.slice(0, 220);

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if ((e as any)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "AI service timed out. Please try again." }), {
        status: 408,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.error("insight error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});