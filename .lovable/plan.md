## Goal
Make every scheduled job and every "today / tomorrow" calculation behave on **Asia/Kolkata (IST, UTC+5:30)** instead of UTC, so reminders land at the intended local hour and target the correct local calendar day.

## Background
- Lovable Cloud's managed Postgres runs `pg_cron` in **UTC** and the cluster timezone cannot be changed. So we keep cron schedules in UTC but **shift the hour by −5:30** to map to the desired IST clock time.
- Edge functions currently use `new Date().toISOString()` to compute "today", which is the UTC date. Around late-evening IST that flips to the next day; for early-morning IST jobs (which run the previous UTC day in the evening) it would point at the wrong date. We need to compute "today in IST" instead.

## Current vs new schedules

All seven `cron.job` rows will be re-scheduled. Intended IST → required UTC cron expression:

| Job | Intent (IST) | Old (UTC) | New (UTC) |
|---|---|---|---|
| `send-task-reminders-daily` | 08:00 IST daily | `30 2 * * *` (08:00 IST ✓ already) | `30 2 * * *` (keep) |
| `send-habit-reminders-daily` | 07:00 IST daily | `30 1 * * *` (07:00 IST ✓ already) | `30 1 * * *` (keep) |
| `send-pantry-alerts-daily` | 09:00 IST daily | `30 3 * * *` (09:00 IST ✓ already) | `30 3 * * *` (keep) |
| `send-weekly-digest-sunday` | 09:00 IST Sun | `30 3 * * 0` (09:00 IST ✓ already) | `30 3 * * 0` (keep) |
| `push-subscription-reminders` | 09:00 IST daily | `0 9 * * *` (= 14:30 IST ✗) | `30 3 * * *` |
| `push-dinner-prep` | 17:00 IST daily | `30 11 * * *` (= 17:00 IST ✓ already) | `30 11 * * *` (keep) |
| `push-savings-nudge` | 10:00 IST Sun | `0 10 * * 0` (= 15:30 IST ✗) | `30 4 * * 0` |

Net effect: only **two** jobs (`push-subscription-reminders`, `push-savings-nudge`) actually need re-scheduling. The rest were already authored against IST hours despite the misleading literal numbers. We will still re-issue all seven via `cron.unschedule` + `cron.schedule` so they're documented and auditable.

## Edge function date-of-day fixes

Add a tiny shared helper `supabase/functions/_shared/time.ts`:

```ts
// Returns "YYYY-MM-DD" for today in Asia/Kolkata.
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

// Returns a Date that, when serialized with todayIST-style formatters,
// equals "today in IST" + N days.
export function istDateOffset(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}
```

Then replace UTC date math in:

- `send-dinner-prep-reminder/index.ts` — `today` → `todayIST()`, tag suffix uses IST date.
- `send-daily-plan-whatsapp/index.ts` — `today` → `todayIST()`.
- `send-habit-reminders/index.ts` — `today` → `todayIST()`.
- `send-subscription-reminders/index.ts` — `todayStr` → `todayIST()`, `horizonStr` → `istDateOffset(3)`. Keep numeric "days away" math but compute against IST midnight.
- `send-pantry-alerts/index.ts` — replace the two `toISOString().split("T")[0]` filters with `todayIST()` and `istDateOffset(3)`.
- `send-task-reminders/index.ts` — switch the "tomorrow" window to IST midnight bounds (compute IST midnight, then convert to a UTC ISO timestamp for the `due_date` filter so we still query in UTC against `timestamptz`). Two values: start = next IST midnight as UTC ISO; end = +24h.
- `send-weekly-digest/index.ts` — current logic uses rolling 7-day windows from `now`, which is timezone-agnostic. **No change needed.**

For `send-task-reminders` specifically, helper:
```ts
// Returns the UTC ISO string for the next IST midnight after now.
export function nextISTMidnightUTC(): string { ... }
```
so the SQL filter `due_date >= start AND due_date < start + 24h` aligns to the IST calendar day.

## Files

**New**
- `supabase/functions/_shared/time.ts` — IST helpers above.

**Edited (edge functions)**
- `supabase/functions/send-dinner-prep-reminder/index.ts`
- `supabase/functions/send-daily-plan-whatsapp/index.ts`
- `supabase/functions/send-habit-reminders/index.ts`
- `supabase/functions/send-subscription-reminders/index.ts`
- `supabase/functions/send-pantry-alerts/index.ts`
- `supabase/functions/send-task-reminders/index.ts`

**New SQL (run via the Supabase insert tool, not a migration — contains anon key + service role lookup, same convention as the existing cron setup)**
- Unschedule all 7 jobs by name, then re-schedule each with the corrected UTC expression listed in the table above.

## Out of scope
- Changing the Postgres cluster timezone (not possible on managed Supabase).
- Rewriting any client-side date formatting — the app already renders in the user's local timezone via the browser.
- DST: India does not observe DST, so a fixed −5:30 offset is correct year-round.

## Verification
1. After deploy, query `cron.job` to confirm the 7 schedules match the "New (UTC)" column.
2. Manually invoke each updated edge function via `curl_edge_functions` and check the response uses the IST date (e.g. on Apr 27 23:30 IST the function should report `2026-04-27`, not `2026-04-28`).
3. Inspect logs of `send-subscription-reminders` after the next 03:30 UTC tick to confirm it ran at 09:00 IST.
