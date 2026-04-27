import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { sendPush } from "../_shared/push.ts";

/**
 * Cron (~5pm local): pings households with a dinner planned for tonight so
 * they remember to prep. Channel: `meals`.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data: items, error } = await admin
      .from("meal_plan_items")
      .select("id, meal_type, scheduled_date, recipe_id, recipes(name), meal_plans!inner(household_id)")
      .eq("scheduled_date", today)
      .ilike("meal_type", "%dinner%");

    if (error) return json({ error: error.message }, 500);

    // Group by household to send one push each.
    const byHousehold = new Map<string, string[]>();
    for (const it of (items ?? []) as Array<Record<string, unknown>>) {
      const householdId = ((it.meal_plans as { household_id: string }).household_id);
      const recipeName = ((it.recipes as { name?: string } | null)?.name) ?? "tonight's dinner";
      const arr = byHousehold.get(householdId) ?? [];
      arr.push(recipeName);
      byHousehold.set(householdId, arr);
    }

    let pushed = 0;
    for (const [householdId, dishes] of byHousehold) {
      const { data: members } = await admin
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);
      const memberIds = (members ?? []).map((m) => m.user_id);
      if (memberIds.length === 0) continue;

      await sendPush({
        user_ids: memberIds,
        channel: "meals",
        title: "🍳 Dinner prep time",
        body: `Tonight: ${dishes.slice(0, 3).join(", ")}${dishes.length > 3 ? "…" : ""}`,
        url: "/meals",
        tag: `dinner-${today}-${householdId}`,
        data: { type: "dinner_prep", date: today },
      });
      pushed += 1;
    }

    return json({ ok: true, households_pushed: pushed });
  } catch (e) {
    console.error("send-dinner-prep-reminder error:", (e as Error).message);
    return json({ error: "Internal error" }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});