import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

const Schema = z.object({
  householdId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  stats: z.object({
    spent: z.number(),
    saved: z.number(),
    habitsPercent: z.number(),
    bestStreak: z.number(),
    mealsCooked: z.number(),
    tasksCompleted: z.number(),
    topCategory: z.string().nullable().optional(),
  }),
});

Deno.serve(async (req) => {
  const log = new Logger("monthly-report-tagline");
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

    const rate = checkRateLimit(auth.user.id, "monthly-report-tagline", AI_RATE_LIMIT);
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
    const { householdId, month, stats } = parsed.data;

    const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, householdId);
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You write a single warm, encouraging closing line (max 140 characters, ONE sentence, max 1 emoji) for an Indian household's monthly report card. Be specific to the numbers, supportive, never preachy or robotic. No hashtags. No quotes around the sentence.`;

    const userPrompt = `Month: ${month}
Spent: ₹${stats.spent}
Saved: ₹${stats.saved}
Habits completion: ${stats.habitsPercent}%
Best streak: ${stats.bestStreak} days
Meals cooked at home: ${stats.mealsCooked} days
Tasks completed: ${stats.tasksCompleted}
Top spending category: ${stats.topCategory || "n/a"}

Write the closing line now.`;

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
    let tagline: string = data?.choices?.[0]?.message?.content?.trim() || "";
    tagline = tagline.replace(/^["“”']+|["“”']+$/g, "").trim();
    if (tagline.length > 200) tagline = tagline.slice(0, 200);

    return new Response(JSON.stringify({ tagline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if ((e as any)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "AI service timed out. Please try again." }), { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log.error("tagline error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});