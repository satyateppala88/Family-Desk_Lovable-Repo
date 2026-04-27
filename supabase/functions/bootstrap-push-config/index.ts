import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

/**
 * One-shot helper: writes the project base URL and service-role key into
 * `public.push_dispatch_config` so DB triggers can invoke `send-push` via
 * `pg_net`. Idempotent — call any time after deployment or after rotating
 * the service-role key.
 *
 * Auth: requires the caller to present the service-role key (so it can't be
 * used to discover secrets — the writer must already have them).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth gate: only callers presenting the service-role key may bootstrap.
  const auth = req.headers.get("Authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? "";
  if (auth !== `Bearer ${SERVICE_ROLE}` && apikey !== SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { error } = await admin
    .from("push_dispatch_config")
    .upsert(
      {
        id: true,
        base_url: SUPABASE_URL,
        service_role_key: SERVICE_ROLE,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});