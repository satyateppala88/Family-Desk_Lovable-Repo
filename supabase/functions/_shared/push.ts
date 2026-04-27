/**
 * Shared helper for fan-out Web Push from any edge function.
 *
 * Calls the `send-push` edge function with the service-role key so it can
 * push to users other than the caller. The receiving function applies the
 * `notification_preferences` channel filter and prunes dead endpoints.
 */

export type PushChannel =
  | "tasks"
  | "habits"
  | "meals"
  | "pantry"
  | "invites"
  | "daily_plan";

export interface SendPushArgs {
  user_ids: string[];
  channel: PushChannel;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface SendPushResult {
  ok: boolean;
  sent?: number;
  pruned?: number;
  error?: string;
}

/**
 * Fire-and-forget push fan-out. Returns a structured result; never throws so
 * callers can safely call it without try/catch around their main flow.
 */
export async function sendPush(args: SendPushArgs): Promise<SendPushResult> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { ok: false, error: "missing env" };
  }
  if (args.user_ids.length === 0) {
    return { ok: true, sent: 0 };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify(args),
    });
    const json = (await res.json().catch(() => ({}))) as SendPushResult & {
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, sent: json.sent, pruned: json.pruned };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}