import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateRequest, verifyHouseholdMembership } from "../_shared/auth.ts";
import { Logger } from "../_shared/logger.ts";

const Schema = z.object({ challengeId: z.string().uuid() });

Deno.serve(async (req) => {
  const log = new Logger("notify-challenge-invite");
  const cors = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { challengeId } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: challenge, error: chErr } = await admin
      .from("household_challenges")
      .select("id, household_id, name, emoji")
      .eq("id", challengeId)
      .single();
    if (chErr || !challenge) {
      return new Response(JSON.stringify({ error: "Challenge not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const isMember = await verifyHouseholdMembership(auth.supabase, auth.user.id, challenge.household_id);
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const [{ data: members }, { data: parts }] = await Promise.all([
      admin.from("household_members").select("user_id").eq("household_id", challenge.household_id),
      admin.from("challenge_participants").select("user_id").eq("challenge_id", challengeId),
    ]);

    const partSet = new Set((parts || []).map((p) => p.user_id));
    const targets = (members || []).map((m) => m.user_id).filter((id) => !partSet.has(id) && id !== auth.user.id);

    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Use dispatch_push via direct RPC by calling send-push edge function
    await admin.functions.invoke("send-push", {
      body: {
        user_ids: targets,
        channel: "habits",
        title: `${challenge.emoji} Join the challenge`,
        body: `Your family started "${challenge.name}". Join in!`,
        url: "/habits",
        tag: `challenge-invite-${challengeId}`,
        data: { type: "challenge_invite", challenge_id: challengeId },
      },
    });

    log.info("Challenge invites sent", { challengeId, count: targets.length });

    return new Response(JSON.stringify({ ok: true, sent: targets.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error("notify-challenge-invite failed", { error: String(e) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});