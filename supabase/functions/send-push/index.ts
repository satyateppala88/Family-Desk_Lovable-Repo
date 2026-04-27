import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Send a Web Push notification.
 *
 * Two ways to call this function:
 *
 * 1. **Service-to-service (preferred for cron jobs / other edge functions)**
 *    Authenticate with the service-role key and pass `user_ids: string[]` plus
 *    a `channel` so the server filters by `notification_preferences`.
 *
 * 2. **End-user "send a test"** — signed-in user can only push to themselves.
 *
 * Body shape:
 * {
 *   user_ids?: string[],          // optional when called by an end user
 *   channel?: "tasks" | "habits" | "meals" | "pantry" | "invites" | "daily_plan",
 *   title: string,
 *   body: string,
 *   url?: string,                  // path to open on click, default "/"
 *   tag?: string,                  // collapse key for OS notification stacking
 *   data?: Record<string, unknown>
 * }
 */

interface SendPayload {
  user_ids?: string[];
  channel?:
    | "tasks"
    | "habits"
    | "meals"
    | "pantry"
    | "invites"
    | "daily_plan";
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@familydesk.in";

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: "VAPID keys not configured" }, 500);
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  try {
    // ---- Auth: accept either service-role (server-to-server) or end-user JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const apikeyHeader = req.headers.get("apikey") ?? "";
    const isServiceRole =
      authHeader === `Bearer ${SERVICE_ROLE}` || apikeyHeader === SERVICE_ROLE;

    let callerUserId: string | null = null;
    if (!isServiceRole) {
      if (!authHeader.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401);
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (error || !data?.claims?.sub) {
        return json({ error: "Unauthorized" }, 401);
      }
      callerUserId = data.claims.sub as string;
    }

    const payload = (await req.json().catch(() => null)) as SendPayload | null;
    if (
      !payload ||
      typeof payload.title !== "string" ||
      typeof payload.body !== "string"
    ) {
      return json({ error: "title and body are required" }, 400);
    }

    // Resolve target user list.
    let userIds: string[] = [];
    if (isServiceRole) {
      if (!Array.isArray(payload.user_ids) || payload.user_ids.length === 0) {
        return json({ error: "user_ids required for server calls" }, 400);
      }
      userIds = payload.user_ids;
    } else {
      // End users can only push to themselves.
      userIds = [callerUserId!];
    }

    // Admin client for cross-user reads (subscriptions, preferences).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Filter out users who have disabled this channel.
    if (payload.channel) {
      const { data: prefs, error: prefsErr } = await admin
        .from("notification_preferences")
        .select(`user_id, ${payload.channel}`)
        .in("user_id", userIds);
      if (prefsErr) return json({ error: prefsErr.message }, 500);

      const allowed = new Set(
        (prefs ?? [])
          .filter((p) => Boolean((p as Record<string, unknown>)[payload.channel!]))
          .map((p) => p.user_id as string)
      );
      // Users without a row default to enabled (matches table defaults).
      const withRow = new Set((prefs ?? []).map((p) => p.user_id as string));
      userIds = userIds.filter((id) => !withRow.has(id) || allowed.has(id));
    }

    if (userIds.length === 0) {
      return json({ ok: true, sent: 0, skipped: "no opted-in recipients" });
    }

    const { data: subs, error: subsErr } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (subsErr) return json({ error: subsErr.message }, 500);

    const subscriptions = (subs ?? []) as SubscriptionRow[];
    if (subscriptions.length === 0) {
      return json({ ok: true, sent: 0, skipped: "no subscriptions" });
    }

    const pushBody = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      tag: payload.tag,
      data: payload.data ?? {},
    });

    let sent = 0;
    let pruned = 0;
    const failures: { endpoint: string; status?: number; error: string }[] = [];
    const staleIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            pushBody,
            { TTL: 60 * 60 * 24 } // 24h
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410: subscription is gone — clean it up.
          if (status === 404 || status === 410) {
            staleIds.push(s.id);
            pruned += 1;
          } else {
            // Defensive: scrub any token-like material from the error message
            // before it lands in logs or the response body. VAPID keys must
            // never round-trip out of this function.
            const rawMsg = (err as Error)?.message ?? "unknown push error";
            const safeMsg = rawMsg
              .replace(/Bearer\s+[A-Za-z0-9._\-=]+/gi, "Bearer [redacted]")
              .replace(/vapid\s*[a-z]=[A-Za-z0-9._\-=]+/gi, "vapid [redacted]")
              .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted-token]");
            failures.push({
              endpoint: s.endpoint,
              status,
              error: safeMsg,
            });
          }
        }
      })
    );

    if (staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }

    // Touch last_seen_at on the ones we successfully reached.
    const liveIds = subscriptions
      .filter((s) => !staleIds.includes(s.id))
      .map((s) => s.id);
    if (liveIds.length > 0) {
      await admin
        .from("push_subscriptions")
        .update({ last_seen_at: new Date().toISOString() })
        .in("id", liveIds);
    }

    return json({ ok: true, sent, pruned, failures });
  } catch (e) {
    // Log only name + message — never the full error object, which on some
    // runtimes serialises request headers (Authorization JWT) and may leak
    // sensitive material to the log stream.
    const err = e as Error;
    console.error("send-push error:", err?.name, err?.message);
    return json({ error: "Internal error sending push" }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});