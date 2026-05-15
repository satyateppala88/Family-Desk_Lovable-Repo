## Goal

Once a user dismisses the calendar event nudge banner ("… today — open calendar?") on the Dashboard, it should never reappear for that specific event. Different events still each show their own nudge once.

## Where

`src/components/dashboard/FestivalBanner.tsx` — the calendar event branch (lines ~117–175). It already uses `localStorage`, but with a 30-day TTL. The user wants permanent, boolean-style persistence using the key pattern `familydesk:event-nudge-dismissed:{eventId|eventDate}`.

## Changes

1. Introduce dedicated helpers (alongside the existing festival ones, which stay TTL-based):
   - `eventNudgeKey(idOrDate)` → `familydesk:event-nudge-dismissed:${idOrDate}`
   - `isEventNudgeDismissed(key)` → `localStorage.getItem(key) === 'true'`
   - `markEventNudgeDismissed(key)` → `localStorage.setItem(key, 'true')`

2. In the calendar event branch:
   - Compute `eventId` from `upcoming.id || upcoming.event_id`. If neither exists, fall back to the event date (`start_date || start_time || start`, normalized to `yyyy-MM-dd`).
   - Build `dismissKey = eventNudgeKey(eventId)`.
   - Replace the current TTL check with `if (isEventNudgeDismissed(dismissKey)) return null;` (evaluated synchronously before the JSX returns).
   - On X click, call `markEventNudgeDismissed(dismissKey)` then bump `dismissTick` to force a re-render and unmount the banner.

3. Leave the festival branch untouched — its TTL behavior is unrelated to this request.

## Result

- Each calendar event has its own permanent dismissed flag in `localStorage`.
- Dismissed nudges never reappear on subsequent `/dashboard` visits.
- New events on different days/IDs still surface their own nudge once.
- No backend, hook, or unrelated UI changes.
