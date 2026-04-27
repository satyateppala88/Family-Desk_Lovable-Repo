# Push Notifications — Phases 2-5 Implementation

Phases 2 (event-driven), 3 (cron-driven), 4 (channel expansion), and 5
(action buttons + deep links) are now live.

## Phase 4 — Channel expansion
- `notification_preferences` gained `finance`, `calendar`, `ai_suggestions`
  columns (default `true`).
- `useNotificationPreferences` hook + `NotificationSettings` UI updated to
  expose the three new toggles.
- `PushChannel` type extended in `_shared/push.ts` and `send-push` payload.

## Phase 2 — Event-driven (DB triggers + dispatcher)
- New `public.dispatch_push(...)` SECURITY DEFINER helper that calls
  `send-push` via `pg_net`. Locked: only triggers can execute.
- Bootstrapper edge function `bootstrap-push-config` writes the project URL
  and service-role key into `push_dispatch_config` (read-locked table).
- AFTER triggers (all swallow errors so the originating txn is never aborted):
  - `tasks` → notify creator on completion
  - `ai_suggestions` → notify all household members on insert
  - `finance_savings_goals` → milestone push at 25/50/75/100 %
  - `household_invitations` → notify inviter when accepted

## Phase 3 — New cron-driven pushes
- `send-subscription-reminders` (daily 09:00 UTC) — bills/subs due in next 3 days.
- `send-dinner-prep-reminder` (daily 11:30 UTC ≈ 5pm IST) — tonight's planned dinner.
- `send-savings-goal-nudge` (Sun 10:00 UTC) — weekly progress nudge for active goals.
- All three scheduled via `cron.schedule` reading the service-role key from
  `push_dispatch_config`.
- Calendar-event 30-min reminders intentionally deferred — Google Calendar
  events aren't currently mirrored into the DB; cron-scanning would require
  per-user OAuth refresh and is out of scope for this pass.

## Phase 5 — UX: action buttons + deep links
- `src/sw.ts` derives default action buttons from `data.type`:
  - `task_assigned` / `task_due` / `task_overdue` → "Mark complete", "Snooze 1h"
  - `habit_reminder` → "Log it"
- `notificationclick` handler maps actions to deep-link URLs
  (`/taskmaster?action=complete&task_id=…` etc).
- Global `NotificationActionRunner` (mounted in `App.tsx`) reads the
  query string via `useNotificationActionHandler` and performs the action
  (Supabase mutation), then strips the params so refresh doesn't repeat it.

---

# Earlier work (kept for context)

## Harden VAPID Private Key Handling

## Audit findings

I grepped the entire repo for `vapid` (case-insensitive). Results:

**Server-only references** (safe — Deno edge runtime, never bundled to the client):
- `supabase/functions/send-push/index.ts` — reads `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` via `Deno.env.get(...)` and passes them to `webpush.setVapidDetails()`.
- `supabase/functions/push-subscribe/index.ts` — reads `VAPID_PUBLIC_KEY` only and returns it to the client.

**Client references** (safe — public key only):
- `src/lib/push-subscription.ts` — fetches the **public** key from the `push-subscribe` edge function at runtime. Never imports any env var, never references the private key.

**Environment files** (`.env` checked, values redacted):
- Only contains `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`. **No VAPID material.**

**Conclusion:** the private key is already correctly scoped to the edge runtime. The remaining work is **defense-in-depth** to keep it that way and to scrub it from logs/errors.

## Hardening changes

### 1. Redact tokens from `send-push` error paths (`supabase/functions/send-push/index.ts`)
The `web-push` library's error messages occasionally include request metadata. None of those code paths today contain VAPID key material, but to be defensive:

- In the per-endpoint `catch` block (around line 188), replace the raw `err.message` returned in `failures[]` with a sanitised version that strips:
  - `Bearer <token>` substrings
  - `vapid t=…` / `vapid k=…` substrings (the JWT signature, which is derived from the private key — should never round-trip into a response)
  - Any base64-ish run of 40+ chars
- In the outer `catch` (line 215), replace `console.error("send-push error", e)` with `console.error("send-push error:", err?.name, err?.message)` so the full error object (which on some runtimes serialises request headers including Authorization) never hits logs.
- Also stop returning `(e as Error).message` to the caller — return a generic `"Internal error sending push"` instead. The detail is still in our edge function logs, but no longer echoed across the wire.

### 2. Add a runtime guard in the client (`src/lib/push-subscription.ts`)
Add an assertion at the top of the file:
```ts
// Defense-in-depth: this module must never be able to read VAPID material.
// The Vite bundler will inline `import.meta.env.VITE_*` strings; ensure none
// of them are VAPID-related so a future refactor can't accidentally expose it.
if (typeof import.meta !== "undefined" && import.meta.env) {
  for (const key of Object.keys(import.meta.env)) {
    if (/vapid/i.test(key)) {
      throw new Error(
        "VAPID material must not be exposed via VITE_* env vars. " +
        "Keys must only live in Supabase secrets and be read inside edge functions."
      );
    }
  }
}
```
This fails fast at module load if anyone later adds `VITE_VAPID_*` to `.env`.

### 3. Add a CI/repo grep guard
Create `scripts/check-no-client-vapid.sh` (and document it in README) that fails if any `src/**` file references `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, or `VITE_VAPID*`. Optional but cheap insurance.

### 4. Verify `supabase/config.toml` has `verify_jwt` correct on `send-push`
`send-push` validates auth in code (accepts service-role OR end-user JWT). Confirm the function isn't accidentally exposed without auth checks. Current code already enforces this (lines 78–98), so just leave a code comment reaffirming the contract.

### 5. Documentation note in `_shared/push.ts`
Add a header comment stating: "Never log the body of `sendPush` errors back to the caller; the response from `send-push` may include sanitised endpoint info but VAPID keys remain server-side only."

## Files to modify
- `supabase/functions/send-push/index.ts` — error/logging redaction (changes 1)
- `src/lib/push-subscription.ts` — runtime guard (change 2)
- `scripts/check-no-client-vapid.sh` — new file (change 3)
- `supabase/functions/_shared/push.ts` — doc comment (change 5)

## What we are explicitly NOT changing
- The VAPID secrets in Supabase — already correctly stored as project secrets.
- The `push-subscribe` function — it returns only the **public** key, which is by design (browsers need it for `applicationServerKey`).
- The client subscribe flow — it already fetches the public key over an authenticated channel, never via env vars.

## Risk summary
- **Before:** private key correctly in edge env, but error messages echoed to caller and full error objects logged → low residual risk.
- **After:** errors sanitised, generic 500 response, runtime guard prevents a future `VITE_VAPID_*` slip → effectively zero exposure surface.
