import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { validateCronSecret } from '../_shared/cron-auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * One-shot helper: writes the project base URL into
 * `public.push_dispatch_config` and stores the service-role key in the
 * encrypted Vault under the name `push_service_role_key` so DB triggers
 * can invoke `send-push` via `pg_net`. Idempotent — call any time after
 * deployment or after rotating the service-role key.
 *
 * Auth: none required. The function only ever writes values it already
 * has via its own Deno env; it cannot be used to disclose secrets.
 */


Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!validateCronSecret(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Upsert the base URL row (no longer stores the key).
  const { error: cfgError } = await admin
    .from("push_dispatch_config")
    .upsert(
      {
        id: true,
        base_url: SUPABASE_URL,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (cfgError) {
    return new Response(JSON.stringify({ error: cfgError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Store / rotate the service-role key in Vault.
  const { error: vaultError } = await admin.rpc("vault_upsert_push_key" as any, {
    _key: SERVICE_ROLE,
  });

  if (vaultError) {
    return new Response(JSON.stringify({ error: vaultError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});