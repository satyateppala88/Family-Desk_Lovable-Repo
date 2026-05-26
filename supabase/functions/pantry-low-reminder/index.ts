import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.78.0/cors";

/**
 * Daily pantry-low reminder.
 * Triggered by pg_cron at 12:30 UTC (= 18:00 IST).
 *
 * For each user with `pantry_daily_reminder = true` AND `pantry = true`,
 * find their household, count pantry items where `quantity < minimum_quantity`,
 * and send a single push if any.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: prefs, error: prefsError } = await admin
      .from("notification_preferences")
      .select("user_id")
      .eq("pantry_daily_reminder", true)
      .eq("pantry", true);

    if (prefsError) throw prefsError;
    const userIds = (prefs ?? []).map((p: any) => p.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map users → household
    const { data: members, error: membersError } = await admin
      .from("household_members")
      .select("user_id, household_id")
      .in("user_id", userIds);
    if (membersError) throw membersError;

    // Group by household to fetch low-stock once
    const householdToUsers = new Map<string, string[]>();
    for (const m of members ?? []) {
      const arr = householdToUsers.get(m.household_id) ?? [];
      arr.push(m.user_id);
      householdToUsers.set(m.household_id, arr);
    }

    let sent = 0;
    for (const [householdId, users] of householdToUsers.entries()) {
      const { data: items, error: itemsError } = await admin
        .from("pantry_items")
        .select("name, quantity, minimum_quantity")
        .eq("household_id", householdId);
      if (itemsError) {
        console.error(JSON.stringify({ level: "error", householdId, error: itemsError.message }));
        continue;
      }
      const low = (items ?? []).filter((i: any) => {
        const q = Number(i.quantity ?? 0);
        const m = Number(i.minimum_quantity ?? 0);
        return m > 0 && q < m;
      });
      if (low.length === 0) continue;

      const names = low.slice(0, 3).map((i: any) => i.name).join(", ");
      const title = "Pantry running low";
      const body =
        `${low.length} item${low.length === 1 ? "" : "s"} running low in your pantry: ${names}. Add to list →`;

      // dispatch_push handles channel filtering + delivery
      const { error: rpcError } = await admin.rpc("dispatch_push", {
        _user_ids: users,
        _channel: "pantry",
        _title: title,
        _body: body,
        _url: "/grocery",
        _tag: `pantry-low-${householdId}-${new Date().toISOString().slice(0, 10)}`,
        _data: { type: "pantry_low", household_id: householdId, count: low.length },
      });
      if (rpcError) {
        console.error(JSON.stringify({ level: "error", householdId, error: rpcError.message }));
        continue;
      }
      sent += users.length;
    }

    console.log(JSON.stringify({ level: "info", sent, households: householdToUsers.size }));
    return new Response(JSON.stringify({ ok: true, sent, households: householdToUsers.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(JSON.stringify({ level: "error", error: e?.message }));
    return new Response(JSON.stringify({ ok: false, error: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});