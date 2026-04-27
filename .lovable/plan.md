# Web Push Notifications for FamilyDesk

Add real push notifications (delivered even when the app/browser is closed) on top of the existing PWA. Works on Android Chrome and desktop browsers. iOS works only when the user has installed the PWA to the home screen (Apple's requirement) — we'll detect and message that.

Important caveats up front:
- Push only works in the **published** build (familydesk.in / familydesk.lovable.app), never inside the Lovable editor preview — same constraint as the PWA itself.
- On iOS, Web Push requires the user to "Add to Home Screen" first. We'll show a hint when we detect iOS Safari without standalone mode.

## What the user will get

1. A new **Notifications** section in Settings showing:
   - Current permission state (Default / Granted / Denied / Unsupported)
   - "Enable push notifications" button (or "Disable" if already on)
   - "Send test notification" button once enabled
   - Per-category toggles: Tasks, Habits, Meals, Pantry, Household invites, Daily plan
2. An auto-prompt (one-time, dismissible) after onboarding completes, asking if they'd like reminders pushed to this device.
3. Notifications appear in the OS notification tray with the FamilyDesk icon, a title, body, and tapping them deep-links into the right module (e.g., a task reminder opens that task).
4. Existing reminder edge functions (task reminders, habit reminders, daily plan, pantry alerts) gain a push channel alongside email/WhatsApp.

## Architecture

```text
Browser (PWA)
  ├─ public/sw.js  ← custom service worker (push + notificationclick)
  ├─ NotificationsManager (React)  ← permission + subscribe/unsubscribe
  └─ POST /functions/v1/push-subscribe  ─┐
                                         ▼
                              push_subscriptions table
                                         ▲
  Edge functions (cron + event-driven) ──┤
  send-task-reminders, send-habit-…      │
  call shared sendPush(userId, payload) ─┘
                                         │
                                         ▼
                            push-dispatch edge function
                            (signs JWT with VAPID keys,
                             POSTs to FCM/Mozilla/Apple endpoints)
```

## Plan

### 1. Service worker (custom, merged with Workbox)

Switch `vite-plugin-pwa` from `generateSW` to `injectManifest` strategy so we can ship our own `src/sw.ts` that:
- Imports Workbox precaching (keeps current offline behaviour).
- Adds `self.addEventListener('push', …)` to show notifications.
- Adds `self.addEventListener('notificationclick', …)` to focus/open the right URL.
- Keeps the iframe/preview-host kill switch in `src/main.tsx` exactly as it is.

### 2. Database

New migration:
- `push_subscriptions` table: `id`, `user_id` (fk auth.users), `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`, `last_seen_at`.
  - RLS: user can SELECT/INSERT/DELETE only their own rows.
- `notification_preferences` table: `user_id` PK, boolean columns per category (`tasks`, `habits`, `meals`, `pantry`, `invites`, `daily_plan`), all default `true`.
  - RLS: user can SELECT/UPDATE only their own row; auto-insert via trigger on first signup (extend `handle_new_user`).

### 3. Edge functions

- **`push-subscribe`** (new): accepts `{endpoint, keys, userAgent}`, validates JWT, upserts into `push_subscriptions`.
- **`push-unsubscribe`** (new): deletes by endpoint for the calling user.
- **`push-dispatch`** (new, internal): takes `{userId, category, title, body, url, data?}`, looks up the user's active subscriptions + preferences, signs a Web-Push JWT with VAPID, POSTs to each endpoint. On 404/410, deletes the dead subscription. Uses Deno's WebCrypto — no npm web-push needed.
- Update existing functions (`send-task-reminders`, `send-habit-reminders`, `generate-daily-plan`, `send-pantry-alerts`, `send-household-invitation`, `send-task-notification`) to additionally invoke `push-dispatch` for users with subscriptions.

### 4. Secrets

Generate a VAPID keypair (P-256, base64url) once, then store:
- `VAPID_PUBLIC_KEY` — also exposed to the frontend (publishable)
- `VAPID_PRIVATE_KEY` — server-only
- `VAPID_SUBJECT` — `mailto:support@familydesk.in`

I'll generate the keypair locally in the build step and ask you to paste them via the secrets prompt.

### 5. Frontend

- `src/lib/push.ts`: helpers `isPushSupported()`, `getPermission()`, `subscribe()`, `unsubscribe()`, `sendTest()`. Handles iOS-standalone detection.
- `src/components/settings/NotificationsSection.tsx`: full settings UI (permission state, master toggle, per-category switches, test button, iOS hint).
- `src/components/notifications/PushPromptBanner.tsx`: one-time dismissible prompt shown on Home after onboarding completion (tracked via `notification_prompt_seen` localStorage flag + a column on `profiles` so it persists across devices).
- Wire entry in existing Settings page route.
- Re-subscription on login: if permission is granted but no subscription exists for this browser, silently re-subscribe.

### 6. QA

- Unit tests for `push.ts` helpers (mock `Notification`, `serviceWorker`, `PushManager`).
- Edge function test for `push-dispatch` VAPID JWT signing.
- Manual checklist (you'll run after publish):
  1. Open https://familydesk.in on Android Chrome → Settings → Enable push → Send test → notification appears.
  2. Tap notification → app opens to expected URL.
  3. Disable → re-enable cycle works.
  4. iOS Safari shows the "Add to Home Screen first" hint; after install + reopen, enable works.
  5. Triggering a real task reminder delivers a push.

## Out of scope (ask if you want any of these)

- In-app toast/notification center UI separate from OS notifications.
- Rich notifications with action buttons (Reply / Mark done) — possible later via `actions` array.
- Push for non-logged-in users / marketing pushes.
- Background sync / offline mutation queue.

## Files I'll create or edit

New:
- `src/sw.ts`
- `src/lib/push.ts`, `src/lib/push.test.ts`
- `src/components/settings/NotificationsSection.tsx`
- `src/components/notifications/PushPromptBanner.tsx`
- `supabase/functions/push-subscribe/index.ts`
- `supabase/functions/push-unsubscribe/index.ts`
- `supabase/functions/push-dispatch/index.ts` (+ test)
- `supabase/functions/_shared/push.ts` (helper used by other functions)
- DB migration for `push_subscriptions` + `notification_preferences` + `handle_new_user` update.

Edited:
- `vite.config.ts` (switch to `injectManifest`, register `src/sw.ts`)
- `src/main.tsx` (no behavioural change beyond keeping the iframe guard)
- Settings page (mount `NotificationsSection`)
- Home page (mount `PushPromptBanner` once)
- The 6 existing reminder edge functions listed above.

After approval I'll start with the DB migration + VAPID secret request, then build outward.
