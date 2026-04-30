import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { sendPush } from "../_shared/push.ts";
import { todayIST, istDateOffset } from "../_shared/time.ts";

/**
 * Daily cron: warns household members about recurring subscriptions / bills
 * coming due in the next 3 days. Channel: `finance`.
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
    const todayStr = todayIST();
    const horizonStr = istDateOffset(3);

    const { data: subs, error } = await admin
      .from("finance_subscriptions")
      .select("id, household_id, name, amount, currency, next_due_date")
      .eq("is_active", true)
      .not("next_due_date", "is", null)
      .gte("next_due_date", todayStr)
      .lte("next_due_date", horizonStr);

    if (error) {
      return json({ error: error.message }, 500);
    }

    let pushed = 0;
    for (const sub of subs ?? []) {
      const { data: members } = await admin
        .from("household_members")
        .select("user_id")
        .eq("household_id", sub.household_id);
      const memberIds = (members ?? []).map((m) => m.user_id);
      if (memberIds.length === 0) continue;

      // Days away based on IST calendar dates, not wall-clock ms.
      const daysAway = Math.max(
        0,
        Math.round(
          (Date.parse(sub.next_due_date + "T00:00:00Z") -
            Date.parse(todayStr + "T00:00:00Z")) /
            86_400_000
        )
      );
      const when =
        daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`;

      await sendPush({
        user_ids: memberIds,
        channel: "finance",
        title: `💳 ${sub.name} renews ${when}`,
        body: `${sub.currency ?? "INR"} ${Number(sub.amount ?? 0).toFixed(2)} due on ${sub.next_due_date}.`,
        url: "/finance/subscriptions",
        tag: `sub-renew-${sub.id}`,
        data: { type: "subscription_renewal", subscription_id: sub.id },
      });
      pushed += 1;
    }

    return json({ ok: true, processed: subs?.length ?? 0, pushed });
  } catch (e) {
    console.error("send-subscription-reminders error:", (e as Error).message);
    return json({ error: "Internal error" }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});