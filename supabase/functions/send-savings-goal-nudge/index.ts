import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { sendPush } from "../_shared/push.ts";
import { validateCronSecret } from "../_shared/cron-auth.ts";

/**
 * Weekly cron: nudges household members about active savings goals that
 * haven't seen progress recently or are nearing their target date.
 * Channel: `finance`.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!validateCronSecret(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: goals, error } = await admin
      .from("finance_savings_goals")
      .select("id, household_id, name, current_amount, target_amount, target_date")
      .eq("status", "active");

    if (error) return json({ error: error.message }, 500);

    let pushed = 0;
    for (const g of goals ?? []) {
      const target = Number(g.target_amount);
      if (!target || target <= 0) continue;
      const pct = Math.floor((Number(g.current_amount ?? 0) / target) * 100);
      if (pct >= 100) continue;

      const { data: members } = await admin
        .from("household_members")
        .select("user_id")
        .eq("household_id", g.household_id);
      const memberIds = (members ?? []).map((m) => m.user_id);
      if (memberIds.length === 0) continue;

      const remaining = target - Number(g.current_amount ?? 0);
      let body = `${pct}% saved so far. ₹${remaining.toFixed(0)} to go.`;
      if (g.target_date) {
        const days = Math.round(
          (new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (days > 0) body += ` ${days} days left.`;
      }

      await sendPush({
        user_ids: memberIds,
        channel: "finance",
        title: `🐷 ${g.name}`,
        body,
        url: "/finance",
        tag: `savings-nudge-${g.id}`,
        data: { type: "savings_nudge", goal_id: g.id },
      });
      pushed += 1;
    }

    return json({ ok: true, goals_pushed: pushed });
  } catch (e) {
    console.error("send-savings-goal-nudge error:", (e as Error).message);
    return json({ error: "Internal error" }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});