## Goal

Bring `/how-to-use` and `/whats-new` in line with the polished page-shell pattern used by `PermissionsSettings` (the most recent canonical spoke), so they feel like first-class settings sub-pages instead of older-looking text screens.

## Current state

Both pages currently render:

```text
[Header]
[← Back]   (text button on its own row)
[icon] Heading
[content]
```

The newer pattern (Permissions, Household Members, Account Settings) renders:

```text
[Header]
[←]  [icon] Heading
     subtitle line
[content]
```

— icon-only ghost back button on the same row as the heading, with an optional supporting subtitle. This reads as a single, intentional page header.

## Changes

### 1. `src/pages/HowToUse.tsx`
Replace the stacked `← Back` text button + heading row with the unified header row:

- Icon-only ghost back button (`size="icon"`, `aria-label="Back to settings"`), navigating to `/settings` (more predictable than `navigate(-1)` — matches `PermissionsSettings`).
- Heading row: `BookOpen` icon + "How to use" title.
- Supporting subtitle: "Short walkthroughs for every Family Desk module."
- Keep the existing `<Header />`, `page-content`, and `max-w-2xl mx-auto space-y-4` shell — no layout regression.

### 2. `src/pages/WhatsNew.tsx`
Apply the exact same shell:

- Icon-only ghost back button → `/settings`, `aria-label="Back to settings"`.
- Heading row: `Sparkles` icon + "What's new" title.
- Supporting subtitle: "Recent updates and improvements across the platform."
- Same `<Header />` + `page-content` + `max-w-2xl` container as before.

### 3. No new components, no routing changes
Both pages already use `Header`, `page-content`, and `page-heading`. The fix is purely re-arranging the existing header markup to match the newer pattern, so there's no new shared component needed (and no risk of breaking the other ~10 spoke pages).

## Out of scope

- Refactoring older spoke pages that still use the stacked back-button pattern (`PrivacyPolicy`, `TermsOfService`, etc.) — keeping this change tightly scoped to the two pages requested.
- No changes to `HowToUseSection` / `WhatsNewSection` content components.

## Acceptance

- `/how-to-use` and `/whats-new` show the back arrow inline with the title, matching `/settings/permissions`.
- Tapping back lands on `/settings` consistently from both pages.
- Mobile and desktop layouts remain within the existing `max-w-2xl` content column with no visual regressions.