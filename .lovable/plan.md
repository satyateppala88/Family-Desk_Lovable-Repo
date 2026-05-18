# Add a v2.2 "What's new" entry — user-facing only

Only one file changes: `src/lib/versioning.ts`.
- Bump `APP_VERSION` from `"2.1"` → `"2.2"`
- Prepend a new entry at the top of `APP_CHANGELOG`

## Proposed v2.2 entry

```
version: "2.2"
date: "2026-05-18"
type: "minor"
title: "Budgets that carry forward, a private Finance hub"
changes:
  - "Finance · Set a monthly budget once and choose \"Apply to future months\" — it carries forward automatically. Edit any month later with a clear \"This month only\" vs \"This and all future months\" choice."
  - "Finance · New Annual Budget option — enter a yearly amount for a category and Family Desk splits it into a clean monthly figure, with a tooltip showing the annual / monthly breakdown."
  - "Finance · Privacy Mode — tap the eye icon in the header to instantly hide amounts across the app."
  - "Finance · Protect the Finance hub with a 4-digit PIN that auto-locks when you walk away."
  - "Finance · Polished spending charts, member contributions, savings, subscriptions, transactions and cards screens for a more consistent feel."
  - "Tasks · Reopen a completed task from History — it slides back into All Tasks, and recurring series stay untouched."
  - "Calendar · Manual events now support full create / edit / delete with repeat rules, and the month grid lays out better on tablets."
  - "Account · Custom-branded sign-up, magic-link, password-reset, invite, email-change and re-authentication emails now come from familydesk.in."
  - "Plus a round of behind-the-scenes bug fixes across Home, Calendar, Meals, Habits and Onboarding to keep things calm and responsive."
```

## Out of scope
- No changes outside `versioning.ts`.
- `WhatsNewSection` picks up the new entry automatically — no UI changes.
- `PRIVACY_VERSION` and `TERMS_VERSION` stay as they are.
