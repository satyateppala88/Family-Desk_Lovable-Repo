# Push Notification Coverage Plan

The Web Push pipeline (`send-push`, `_shared/push.ts`, VAPID keys, `notification_preferences` table with channels: `tasks`, `habits`, `meals`, `pantry`, `invites`, `daily_plan`) is already live. Today only **`send-task-reminders`** actually fires push. Every other notification surface still relies on email/WhatsApp only.

This plan inventories every place a push would meaningfully help, groups them by the existing channel, flags missing channels, and lays out an implementation order.

## 1. Scenarios where push notifications add value

### Tasks channel (`tasks`)
| Trigger | Where it lives today | Push wanted? |
|---|---|---|
| Task assigned to me | `src/hooks/useTasks.ts` → `send-task-notification` (email) | Yes — instant "New task: …" |
| Task due soon / overdue reminder | `send-task-reminders` cron | Already wired ✅ |
| Task I created/assigned was completed | `useTasks.ts` status update | Yes — "Asha completed: Pay electricity bill" |
| Task comment / note added (if/when comments ship) | n/a | Future |
| Daily plan accepted / generated | `generate-daily-plan` | Use `daily_plan` channel |

### Habits channel (`habits`)
| Trigger | Today | Push wanted? |
|---|---|---|
| Daily habit reminder at user's `reminder_time` | `send-habit-reminders` cron (email) | Yes — primary channel for habits |
| Streak milestone (3/7/30 day) | scoring logic in `useHabits` | Yes — celebratory push |
| Streak about to break (no log by 8pm) | new cron | Yes — "Don't lose your 12-day streak" |
| New household habit assigned to me | habit create flow | Yes |
| Household goal completed | `household_habit_goals` | Yes |

### Meals channel (`meals`)
| Trigger | Today | Push wanted? |
|---|---|---|
| Weekly meal plan generated / shared | `useMealPlans.ts` → `send-meal-plan-summary` (email) | Yes |
| "What's for dinner?" reminder ~5pm | new cron | Yes |
| Cook-of-the-day rotation reminder | new | Yes |

### Pantry channel (`pantry`)
| Trigger | Today | Push wanted? |
|---|---|---|
| Item expiring in N days | `send-pantry-alerts` cron (email) | Yes |
| Item out of stock / low stock | `send-pantry-alerts` | Yes |
| Shopping list ready | `generate-shopping-list` | Yes |

### Invites channel (`invites`)
| Trigger | Today | Push wanted? |
|---|---|---|
| Household invitation received | `InviteMemberDialog` → `send-household-invitation` (email) | Yes — for already-registered invitees |
| Join request submitted (notify admins) | `send-join-request-notification` | Yes |
| Invitation accepted/declined | `send-invitation-response` | Yes |
| Access request approved/rejected (platform) | `AdminAccessRequests` → `send-access-decision` | Yes |

### Daily plan channel (`daily_plan`)
| Trigger | Today | Push wanted? |
|---|---|---|
| Morning daily plan ready | `generate-daily-plan` + `send-daily-plan-whatsapp` | Yes — push at 7am with top 3 tasks |
| Evening wrap-up summary | new cron | Yes — "You completed 4/6 tasks today" |

### New channel proposals (require schema add)
These don't fit existing channels:

- **`finance`** — bill/subscription due in 3 days (`finance_subscriptions.next_due_date`), budget breach (>90% of category), large transaction logged by another member, monthly review ready.
- **`calendar`** — event starting in 15 min, new event added by household member, calendar sync errors.
- **`ai_suggestions`** — new high-value `ai_suggestions` row (e.g. "I noticed you keep buying milk on Sundays — add to recurring?").
- **`system`** (always-on, not user-toggleable) — security alerts (new device login), critical sync failures.

## 2. Implementation phases

### Phase 1 — Wire push into existing notification edge functions (no schema change)
Add a `sendPush()` fan-out call alongside the existing email/WhatsApp send in:
1. `send-task-notification` (assignment) — channel `tasks`
2. `send-habit-reminders` (cron) — channel `habits`
3. `send-pantry-alerts` (cron) — channel `pantry`
4. `send-meal-plan-summary` — channel `meals`
5. `send-household-invitation`, `send-join-request-notification`, `send-invitation-response` — channel `invites`
6. `send-access-decision` — channel `invites` (or new `system`)
7. `send-daily-plan-whatsapp` (rename concept to multi-channel) — channel `daily_plan`
8. `send-weekly-digest` — channel `daily_plan`

For each: pass `user_ids`, `title`, `body`, `url` (deep link into the relevant page), `tag` (for collapsing duplicates), `data` (entity id for click handling).

### Phase 2 — New event-driven pushes (no new cron)
Hook into existing client mutations to trigger push fan-out via a thin new edge function (or extend existing ones):
- Task **completed** → notify creator (in `useTasks.updateStatus`)
- Task **assigned** to me by someone else → already covered if Phase 1 adds push to `send-task-notification`
- New **AI suggestion** generated → notify household members
- New **household habit** created and assigned → notify assignees

### Phase 3 — New cron-driven pushes
Add `pg_cron` schedules + new edge functions:
- `send-streak-risk-alerts` — 8pm local, users with active streak and no log today
- `send-meal-dinner-reminder` — 5pm local
- `send-evening-wrap-up` — 9pm local
- `send-finance-bill-reminders` — daily 9am, bills due in 3 days
- `send-calendar-event-reminders` — every 15 min, events starting soon

### Phase 4 — New channels & schema
Add columns to `notification_preferences`: `finance`, `calendar`, `ai_suggestions`. Update `PushChannel` union, `useNotificationPreferences` hook, and `NotificationSettings.tsx` UI to expose the new toggles. Add a non-toggleable `system` path that bypasses preference filtering for critical alerts only.

### Phase 5 — UX polish
- **Deep-link routing**: service worker click handler navigates to `data.url` (e.g. `/tasks/{id}`, `/habits`, `/pantry`).
- **Notification grouping/tags**: use stable `tag` per entity so a re-sent reminder replaces the old one.
- **Action buttons**: "Mark complete" / "Snooze 1h" on task pushes, "Logged ✓" on habit pushes (requires service worker `notificationclick` handler + a lightweight action endpoint).
- **Quiet hours**: per-user setting (e.g. no pushes 10pm–7am) stored on `notification_preferences`.
- **Badging**: PWA app icon badge count for unread items via Badging API where supported.

## 3. Suggested build order (small, shippable PRs)

1. Phase 1 batch A: `send-task-notification`, `send-household-invitation`, `send-join-request-notification`, `send-invitation-response`, `send-access-decision` (event-driven, easiest to test).
2. Phase 1 batch B: cron functions — `send-habit-reminders`, `send-pantry-alerts`, `send-meal-plan-summary`, `send-weekly-digest`, daily plan.
3. Phase 2: task-completed notify-creator + AI suggestion push.
4. Phase 4 schema + UI for new channels (`finance`, `calendar`, `ai_suggestions`, quiet hours).
5. Phase 3 new cron jobs (streak risk, dinner reminder, bill reminder, calendar event reminder).
6. Phase 5 deep-link click handler + action buttons + badging.

## Technical notes

- All new fan-outs use the existing `sendPush()` helper from `supabase/functions/_shared/push.ts` — no per-function VAPID handling.
- Channel filtering and dead-endpoint pruning are already centralized in `send-push`; new callers just pick the right `channel`.
- For new channels: migration adds boolean columns defaulting to `true`, updates `handle_new_user()` is not needed (defaults cover it), then update the `PushChannel` TS union and the React hook/UI.
- For deep links, standardize a `url` convention per entity type (`/tasks/:id`, `/habits`, `/pantry`, `/meals`, `/finance/subscriptions`, `/calendar`, `/settings/household/invitations`).
- Service worker (`public/sw.js` or generated by VitePWA) needs a `notificationclick` listener that does `clients.openWindow(event.notification.data.url)`.
- Quiet hours: enforce in `send-push` by reading user prefs and skipping (or queuing for later) if current local time falls in the user's quiet window — requires storing `timezone` on profile.

## Summary of net-new artifacts

- Edge functions modified: 8 (Phase 1)
- Edge functions added: ~5 (Phase 3 crons + helper for ad-hoc events)
- Migrations: 1 (new preference columns + quiet hours + timezone)
- Frontend: `useNotificationPreferences`, `NotificationSettings.tsx`, service worker click handler
