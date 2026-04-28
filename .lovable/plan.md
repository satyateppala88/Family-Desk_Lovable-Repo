# Fix AI chat polish + smarter back navigation

## What's wrong today

1. **Two X buttons on the AI chat panel.** Both shadcn `SheetContent` (desktop) and `DrawerContent` (mobile) ship with their own built-in close (X) button. Our header in `AIChatWidget` adds a second X, so the user sees two.
2. **Sparkle FAB stays visible while the chat is open**, sitting in the bottom-right where it overlaps the mic and send buttons inside the chat input row.
3. **"Back" in the Header always jumps to `/dashboard`.** From a sub-page like `/finance/transactions` or `/taskmaster/projects/123`, pressing back loses the parent context and dumps the user on Home, which feels wrong.

## Fixes

### 1. AI chat — single close, FAB hides when open
File: `src/components/ai/AIChatWidget.tsx`

- Remove the custom `<X>` button from the chat header. Keep the built-in close from `SheetContent` / `DrawerContent` (it's positioned top-right and is the platform-standard one).
- Keep the "Start fresh" button.
- Hide the sparkle FAB when `isOpen` is `true` so it stops overlapping the mic/send icons. (Render the FAB only when `!isOpen`.)

### 2. Smarter Header back button
File: `src/components/layout/Header.tsx`

Replace the hardcoded `navigate("/dashboard")` with a small "parent route" resolver:

- `/finance/<anything>` → `/finance`
- `/taskmaster/projects/:id` → `/taskmaster/projects`
- `/taskmaster/<anything>` → `/taskmaster`
- `/admin/<anything>` → `/admin/access-requests` (or `/dashboard` if none)
- `/members`, `/invitations`, `/account-settings`, `/settings`, `/how-to-use`, `/whats-new`, `/terms`, `/privacy`, `/permissions`, `/notifications`, top-level module pages (`/tasks`, `/meals`, `/grocery`, `/calendar`, `/habits`, `/finance`) → `/dashboard`
- Anything else → `/dashboard` (safe default)

This is computed from `location.pathname` only — no reliance on `history.back()`, so deep links and refreshes always behave correctly. The chevron stays in the same place; only the destination becomes context-aware.

Header continues to hide the back button on `/` and `/dashboard` (unchanged).

## Files changed

- `src/components/ai/AIChatWidget.tsx` — remove duplicate X, hide FAB when open
- `src/components/layout/Header.tsx` — context-aware back destination

## Out of scope

- No design/style changes to the chat header beyond removing the extra button.
- No changes to other pages — the audit confirmed every authenticated page already uses `<Header />`, so fixing the Header propagates everywhere.
- Public pages (`/auth`, `/landing`, `/welcome`, `/terms`, `/privacy`, `/verify-email`, `/request-access`, `/install`) keep their existing in-page back/CTA patterns; those aren't affected.
