import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Manage Web Push subscriptions for the authenticated user.
 *
 * POST { action: "subscribe", subscription: PushSubscriptionJSON, user_agent?: string }
 *   → Upserts the subscription on (user_id, endpoint).
 *
 * POST { action: "unsubscribe", endpoint: string }
 *   → Deletes the row matching the endpoint for this user.
 *
 * Returns the VAPID public key on every successful call so the client never
 * has to hardcode it.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  if (!vapidPublicKey) {
    console.error("[push-subscribe] VAPID_PUBLIC_KEY env var is missing");
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid body" }, 400);
    }

    const action = (body as { action?: string }).action;

    if (action === "subscribe") {
      const sub = (body as { subscription?: PushSubscriptionJSON }).subscription;
      const userAgent = (body as { user_agent?: string }).user_agent ?? null;

      if (
        !sub ||
        typeof sub.endpoint !== "string" ||
        !sub.keys ||
        typeof sub.keys.p256dh !== "string" ||
        typeof sub.keys.auth !== "string"
      ) {
        return json({ error: "Invalid subscription" }, 400);
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            user_agent: userAgent,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" }
        );

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, vapidPublicKey });
    }

    if (action === "unsubscribe") {
      const endpoint = (body as { endpoint?: string }).endpoint;
      if (typeof endpoint !== "string" || endpoint.length === 0) {
        return json({ error: "Missing endpoint" }, 400);
      }
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, vapidPublicKey });
    }

    if (action === "publicKey" || !action) {
      return json({ ok: true, vapidPublicKey });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("push-subscribe error", e);
    return json({ error: (e as Error).message }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});