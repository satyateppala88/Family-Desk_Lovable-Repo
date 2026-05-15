## Root cause

The Live (and Test) email queue dispatcher cron job has been failing every 5 seconds with:

```text
ERROR: relation "pgmq.q_auth_emails" does not exist
```

The cron command runs `EXISTS (SELECT 1 FROM pgmq.q_auth_emails ...)` before posting to `process-email-queue`. Because the `auth_emails` queue was never created in either environment, that check throws, the HTTP post never fires, and every verification email enqueued to `transactional_emails` stays `pending` forever.

That is why Manoj, Amritha, and Anuradha never receive a verification email no matter how many times they retry — the email is generated and queued, then silently stuck.

Profiles are also still missing `email_verified_at`, so even if they were verified via Supabase's own confirm link, the app's production sign-in gate keeps blocking them.

## Plan

1. **Create the missing `auth_emails` pgmq queue (Test + Live)**
   - Migration that calls `pgmq.create('auth_emails')` if absent, plus seeds the `email_send_state` config row with sane defaults if empty.
   - Once the queue exists, the cron job stops erroring and starts invoking `process-email-queue` again on its 5-second schedule.
   - The 5 stuck transactional emails (all to Manoj) will drain on the next tick.

2. **Backfill verified flag for the three users in Live**
   - Set `profiles.email_verified_at = now()` for Manoj, Amritha (both addresses), and Anuradha so they can sign in immediately without waiting for a fresh email round-trip.
   - Same backfill in Test for parity.

3. **Verify**
   - Re-check `cron.job_run_details` — runs should be `succeeded`.
   - Re-check `pgmq.q_transactional_emails` count — should drop to 0.
   - Re-check `email_send_log` — Manoj rows should flip from `pending` to `sent`.
   - Re-check the four profile rows — `email_verified_at` populated.

4. **Publish**
   - The migration applies to Test on save and to Live on Publish, so the user must Publish to fix Live.
   - The data backfill (step 2) for Live needs to run via the data-update tool against production immediately after Publish, since data does not sync between environments.

## Technical notes

- No app/UI code changes. This is purely a backend/infra repair.
- `pgmq.create()` is idempotent-ish but we'll guard with a `DO` block that checks `pg_class` first.
- The `email_send_state` insert uses `ON CONFLICT (id) DO NOTHING` so existing rows are untouched.
- Custom verification flow stays the source of truth (`profiles.email_verified_at`); auto-confirm-on-signup remains enabled on the auth side so Lovable Cloud doesn't send its own verification email.