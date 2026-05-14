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

  try {
    const resp = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
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