## Plan: Add v2.1 entry to "What's new"

Single-file edit to `src/lib/versioning.ts`.

### Changes

1. Bump `APP_VERSION` from `"2.0"` → `"2.1"`.
2. Prepend a new `ChangelogEntry` to the top of `APP_CHANGELOG` (newest-first ordering preserved).

### New entry (warm, user-facing microcopy)

```text
version: "2.1"
date:    "2026-05-14"
type:    "minor"
title:   "Smarter recurrence and a calmer setup"
changes:
  - One unified Recurrence picker now powers Calendar events, Tasks,
    Habits and Subscriptions — pick daily, weekly, monthly, yearly or a
    custom rule, with an end date or a number of occurrences.
  - Recurring items show a friendly summary like
    "Every 2 weeks on Mon, Wed · Until 30 Jun" wherever they appear.
  - Saving Calendar preferences now works reliably — fixed a permissions
    issue that was blocking visibility and reminder settings from saving.
  - Module setup screens for Home, Calendar, Habits and Finance no
    longer reappear after you've completed them.
  - Small polish on date pickers across Calendar, Tasks, Finance and
    Grocery for a more consistent feel.
```

No links/tours attached (these are quality-of-life updates, not new tours).

### Out of scope

- No UI/component changes to `WhatsNewSection.tsx` or `WhatsNew.tsx` — they already render whatever is in `APP_CHANGELOG`.
- No changes to Privacy/Terms versions.
- No memory updates needed (release notes are content, not architectural rules).
