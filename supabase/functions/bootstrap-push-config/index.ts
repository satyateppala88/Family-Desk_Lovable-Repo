import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

/**
 * One-shot helper: writes the project base URL and service-role key into
 * `public.push_dispatch_config` so DB triggers can invoke `send-push` via
 * `pg_net`. Idempotent — call any time after deployment or after rotating
 * the service-role key.
 *
 * Auth: none required. The function only ever writes values it already has
 * via its own Deno env; it cannot be used to disclose secrets (the row is
 * not readable from the public API — RLS denies all non-service-role reads).
 * The worst an anonymous caller can do is overwrite the row with the same
 * values, which is a no-op.
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