/**
 * Validates that the request comes from an authorised cron caller.
 * The caller must send: Authorization: Bearer <CRON_SECRET>
 * CRON_SECRET is configured as an Edge Function secret and mirrored
 * into Vault (name: cron_secret) for pg_cron jobs to read at runtime.
 */
export function validateCronSecret(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return false; // secret not configured — deny all
  const auth = req.headers.get("Authorization") ?? "";
  return auth === `Bearer ${secret}`;
}