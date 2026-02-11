

# Fix Email Function Issues

Four distinct issues to resolve across the edge functions.

---

## 1. Replace `getClaims()` with `getUser()` in 3 functions

The `getClaims()` method is not a standard Supabase JS method and may fail at runtime. Three functions use it:

- `send-task-notification/index.ts` (line 52)
- `send-household-invitation/index.ts` (line 49)
- `send-invitation-response/index.ts` (line 44)

**Fix:** Replace the `getClaims()` call with `supabase.auth.getUser()` which is the standard, supported method.

```typescript
// Before:
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }

// After:
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
if (authError || !authUser) { ... }
```

---

## 2. Fix pantry alerts email preference check

The `user_email_preferences` table has no `pantry_alerts` column. The function currently checks `meal_summaries` on line 114, which is wrong.

**Fix:** Add a `pantry_alerts` column to the table (defaulting to `true`) and update the function to check it.

**Database migration:**
```sql
ALTER TABLE public.user_email_preferences
ADD COLUMN IF NOT EXISTS pantry_alerts BOOLEAN DEFAULT true;
```

**Code change in `send-pantry-alerts/index.ts`:**
```typescript
// Before (line 109):
.select("meal_summaries, pantry_alerts_whatsapp")

// After:
.select("pantry_alerts, pantry_alerts_whatsapp")

// Before (line 114):
if (prefs?.meal_summaries !== false) {

// After:
if (prefs?.pantry_alerts !== false) {
```

The notification preferences UI will also need updating to expose this new toggle.

---

## 3. Update hardcoded URLs to `familydesk.in`

13 files contain `familydesk.lovable.app` URLs. All link URLs in emails/WhatsApp messages should point to the production domain `familydesk.in`.

**Files to update:**

| File | Hardcoded URL |
|------|--------------|
| `_shared/email-templates.ts` | Logo URL and footer link |
| `send-task-notification/index.ts` | Task URL |
| `send-household-invitation/index.ts` | Accept URL |
| `send-task-reminders/index.ts` | Today URL |
| `send-habit-reminders/index.ts` | Habits URL (2 places) |
| `send-pantry-alerts/index.ts` | Grocery URL (2 places) |
| `send-weekly-digest/index.ts` | Dashboard URL |
| `send-meal-plan-summary/index.ts` | Meals URL |
| `send-access-decision/index.ts` | Auth URL |
| `send-join-request-notification/index.ts` | Members URL |
| `send-daily-plan-whatsapp/index.ts` | Today URL |
| `verify-email-token/index.ts` | Fallback URL |

All instances of `https://familydesk.lovable.app` will be replaced with `https://familydesk.in`.

---

## 4. Set up pg_cron scheduled jobs

The `pg_cron` extension is not yet enabled. Four functions need automated scheduling:

| Function | Schedule | Description |
|----------|----------|-------------|
| `send-task-reminders` | Daily at 8:00 AM IST (2:30 AM UTC) | Tasks due tomorrow |
| `send-habit-reminders` | Daily at 7:00 AM IST (1:30 AM UTC) | Incomplete habits for the day |
| `send-pantry-alerts` | Daily at 9:00 AM IST (3:30 AM UTC) | Items expiring within 3 days |
| `send-weekly-digest` | Sundays at 9:00 AM IST (3:30 AM UTC) | Weekly activity summary |

**Steps:**
1. Enable `pg_cron` and `pg_net` extensions via migration
2. Insert cron schedules using the data insert tool (since they contain project-specific URLs and keys)

---

## Summary of changes

| Type | What |
|------|------|
| Database migration | Add `pantry_alerts` column, enable `pg_cron` and `pg_net` extensions |
| Database insert | Create 4 cron job schedules |
| Edge function edits | 13 files -- fix `getClaims()`, fix preference check, update URLs |
| UI update | Add pantry alerts toggle to notification preferences |

