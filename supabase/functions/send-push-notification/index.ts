// Thin alias for the canonical `send-push` function.
//
// This exists so callers/cron jobs that target the
// `/functions/v1/send-push-notification` URL continue to work — it forwards
// the incoming request (body + Authorization header) to `send-push`, which
// owns all the real logic (auth, channel filtering, web-push delivery,
// 410-cleanup, last_seen_at touch).
//
// Do NOT add new behaviour here. Add it to `send-push`.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const target = `${SUPABASE_URL}/functions/v1/send-push`;

    // Pass through the original Authorization (service-role for cron, end-user
    // JWT for in-app calls). If absent, fall back to service-role so internal
    // pg_cron callers that forgot the header still work.
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const incomingAuth = req.headers.get("Authorization");
    const auth = incomingAuth ?? `Bearer ${SERVICE_ROLE}`;

    const body = await req.text();

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        apikey: SERVICE_ROLE,
      },
      body,
    });

    const respBody = await upstream.text();
    return new Response(respBody, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e as Error;
    console.error("send-push-notification proxy error:", err?.name, err?.message);
    return new Response(
      JSON.stringify({ error: "Internal error forwarding push" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});