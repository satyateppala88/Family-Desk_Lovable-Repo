import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES = 50;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(MAX_MESSAGE_LENGTH),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).max(MAX_MESSAGES),
  householdId: z.string().uuid(),
});

serve(async (req) => {
  const log = new Logger("ai-finance-chat");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.errors.map((e) => e.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, householdId } = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.warn("Invalid token");
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.setContext({ userId: user.id, householdId });

    // Rate limiting
    const rateCheck = checkRateLimit(user.id, "ai-finance-chat", AI_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) },
      });
    }

    // Verify household membership
    const { data: membership } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      log.warn("Not a household member");
      return new Response(JSON.stringify({ error: "Not a member of this household" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch financial context
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [y, m] = [now.getFullYear(), now.getMonth() + 1];
    const monthStart = `${currentMonth}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

    // Get transactions for current month
    const { data: transactions } = await supabase
      .from("finance_transactions")
      .select("amount, type, category, description, transaction_date")
      .eq("household_id", householdId)
      .gte("transaction_date", monthStart)
      .lt("transaction_date", nextMonth)
      .order("transaction_date", { ascending: false })
      .limit(100);

    // Get budgets
    const { data: budgets } = await supabase
      .from("finance_budgets")
      .select("category, planned_amount")
      .eq("household_id", householdId)
      .eq("month", currentMonth);

    // Get savings goals
    const { data: goals } = await supabase
      .from("finance_savings_goals")
      .select("name, target_amount, current_amount, target_date, status")
      .eq("household_id", householdId)
      .eq("status", "active");

    // Compute summary
    const txList = transactions || [];
    const income = txList.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expenses = txList.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);

    const categorySpend: Record<string, number> = {};
    txList.filter((t: any) => t.type === "expense").forEach((t: any) => {
      categorySpend[t.category] = (categorySpend[t.category] || 0) + Number(t.amount);
    });

    const overBudget = (budgets || [])
      .filter((b: any) => (categorySpend[b.category] || 0) > Number(b.planned_amount))
      .map((b: any) => `${b.category}: spent ₹${categorySpend[b.category]?.toFixed(0)} vs ₹${Number(b.planned_amount).toFixed(0)} budget`);

    const financialContext = `
HOUSEHOLD FINANCIAL DATA (${currentMonth}):
- Monthly Income: ₹${income.toFixed(0)}
- Monthly Expenses: ₹${expenses.toFixed(0)}
- Net Savings: ₹${(income - expenses).toFixed(0)}
- Savings Rate: ${income > 0 ? ((income - expenses) / income * 100).toFixed(0) : 0}%

Category-wise Spending:
${Object.entries(categorySpend).map(([cat, amt]) => `  ${cat}: ₹${(amt as number).toFixed(0)}`).join("\n") || "  No expenses recorded"}

${overBudget.length > 0 ? `\nOver-Budget Categories:\n${overBudget.map(s => `  ⚠ ${s}`).join("\n")}` : ""}

${budgets?.length ? `\nMonthly Budgets:\n${budgets.map((b: any) => `  ${b.category}: ₹${Number(b.planned_amount).toFixed(0)}`).join("\n")}` : ""}

${goals?.length ? `\nSavings Goals:\n${goals.map((g: any) => `  ${g.name}: ₹${Number(g.current_amount).toFixed(0)} / ₹${Number(g.target_amount).toFixed(0)} (${g.target_date ? `due ${g.target_date}` : "no deadline"})`).join("\n")}` : ""}

Recent Transactions (last 10):
${txList.slice(0, 10).map((t: any) => `  ${t.transaction_date} | ${t.type} | ${t.category} | ₹${Number(t.amount).toFixed(0)} | ${t.description || "-"}`).join("\n") || "  None"}
`.trim();

    const systemPrompt = `You are FamilyDesk Finance Advisor, a friendly and supportive household finance assistant for Indian families.

Your personality:
- Warm, encouraging, non-judgmental
- Uses simple language — no financial jargon
- Focuses on practical, actionable advice
- Uses ₹ (INR) everywhere, formats in Indian style (lakhs, crores)

Your capabilities:
- Analyse household spending patterns
- Compare budget vs actual spending
- Suggest areas to save money
- Help plan for savings goals
- Provide cash flow insights

IMPORTANT RULES:
- You are NOT a licensed financial advisor. Never give investment or tax advice.
- Never recommend specific stocks, mutual funds, or financial products.
- Focus on budgeting, cash flow, and savings trade-offs.
- Always reference the actual household data when answering.
- Be supportive — celebrate wins, gently flag concerns.
- Keep responses concise and practical.

${financialContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
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
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("Finance chat error:", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
