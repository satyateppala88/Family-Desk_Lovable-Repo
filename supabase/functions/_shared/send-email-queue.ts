// Helper used by all transactional email-sending edge functions.
// Replaces direct Resend calls with an enqueue to the Lovable Email queue
// via the send-transactional-email edge function.

export interface SendQueueParams {
  to: string;
  subject: string;
  html: string;
  templateName: string; // logical label, e.g. "verification-email"
  idempotencyKey?: string;
}

export interface SendQueueResult {
  data?: unknown;
  error?: string;
}

export async function sendViaQueue(
  supabaseUrl: string,
  serviceRoleKey: string,
  params: SendQueueParams,
): Promise<SendQueueResult> {
  const idempotencyKey =
    params.idempotencyKey ?? `${params.templateName}-${crypto.randomUUID()}`;

  // Use the anon/publishable key for the Authorization header. The
  // send-transactional-email function only requires *a valid JWT* at the
  // gateway (verify_jwt = true) and runs all privileged work with its own
  // SUPABASE_SERVICE_ROLE_KEY internally. Using the anon key here avoids
  // 401s when the caller's SUPABASE_SERVICE_ROLE_KEY env var is stale
  // (e.g. after a key rotation that hasn't been republished to this
  // function yet).
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    serviceRoleKey;

  try {
    const resp = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          templateName: "raw-html",
          recipientEmail: params.to,
          idempotencyKey,
          templateData: {
            html: params.html,
            subject: params.subject,
          },
        }),
      },
    );

    let body: any = null;
    try {
      body = await resp.json();
    } catch {
      body = null;
    }

    if (!resp.ok) {
      return {
        error:
          body?.error ??
          `send-transactional-email returned HTTP ${resp.status}`,
      };
    }

    if (body && body.success === false) {
      // e.g. recipient is on the suppression list
      return { data: body };
    }

    return { data: body };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}