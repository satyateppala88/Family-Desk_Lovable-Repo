## Current state

- 14 edge functions send mail directly via the Resend SDK from `noreply@familydesk.in` (root domain).
- Lovable Email infrastructure is now provisioned on `notify.familydesk.in` (subdomain delegated to Lovable nameservers). The pgmq queue + `process-email-queue` dispatcher are deployed.
- No DNS conflict: Resend uses the root domain, Lovable Email uses the `notify` subdomain — they can coexist.

## Decision needed

Two valid paths. Pick one:

### Option A — Keep Resend, do nothing
- Leave all 14 functions on Resend.
- Take down the unused Lovable Email infra (or leave dormant).
- Pros: zero work, sender stays `noreply@familydesk.in` (root, recognizable).
- Cons: still depend on Resend API key + quota; branded auth-email templates from Lovable Email won't be used.

### Option B — Migrate everything to Lovable Email (recommended)
- Replace direct Resend calls with the Lovable Email queue (durable retries, rate-limit handling, send log, suppression, unsubscribe tokens, no Resend dep).
- New sender becomes `noreply@notify.familydesk.in` (or `Family Desk <noreply@notify.familydesk.in>`).
- Auth emails (verification, password reset, magic link) automatically use the branded `auth-email-hook` once scaffolded.

## Plan for Option B

1. **Scaffold transactional email system**
   - Run the transactional email scaffolder. This creates:
     - `supabase/functions/send-transactional-email/index.ts` (queue-backed sender)
     - `supabase/functions/_shared/email-templates/registry.ts` + per-template React Email files
     - `supabase/functions/handle-email-unsubscribe/index.ts`
   - Set `SENDER_DOMAIN = notify.familydesk.in`, `FROM_DOMAIN = familydesk.in` (display).

2. **Port each existing template into the registry** (14 templates):
   - `verification-email`, `verify-email-token` (welcome after verify)
   - `household-invitation`, `invitation-response`, `household-member-welcome`, `join-request-notification`
   - `access-request-confirmation`, `access-decision`
   - `task-notification`, `task-reminders`, `habit-reminders`, `pantry-alerts`, `meal-plan-summary`, `weekly-digest`
   - Convert each existing inline HTML into a React Email template under `_shared/email-templates/`.
   - Apply Family Desk branding (Poppins, brand green `#0F6E56`, ink scale, surface `#F1EFE8`, logo lockup).

3. **Refactor the 14 edge functions**
   - Remove `import { Resend } from "npm:resend"` and `RESEND_API_KEY` usage.
   - Replace `resend.emails.send({...})` with a call to `send-transactional-email` (passing `templateName`, `to`, and template props).
   - Keep all surrounding business logic (recipient lookup, dedup, logging) untouched.

4. **Auth emails**
   - Scaffold `auth-email-hook` so Supabase auth emails (signup confirm, recovery, magic link, invite, email change, reauthentication) are also branded and queued.
   - Confirm the hook uses the queue pattern (`enqueue_email`), not direct send.

5. **Cleanup**
   - Delete `RESEND_API_KEY` runtime secret once all functions are migrated and verified.
   - Optionally disconnect the Resend connector from the workspace.
   - Remove `npm:resend@2.0.0` imports.

6. **Verification**
   - Deploy all touched functions.
   - Trigger one email per template (test user) and confirm row in `email_send_log` reaches `sent`.
   - Check spam-folder placement on Gmail/Outlook for the new `notify.familydesk.in` sender.

## Estimated work

~1–2 hours of mechanical refactoring (14 functions × identical pattern) + template porting.

## Recommendation

Go with **Option B**. The infra is already paid for (DNS delegated, queue running) and removes the Resend dependency, gives durable retries, suppression list, and unified send logging — plus branded auth emails which Resend cannot do for Supabase auth flows out of the box.

Reply with **A** or **B** (and any tweaks) and I'll execute.
