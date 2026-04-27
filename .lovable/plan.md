# Plan: Versioning, How-to-Use & What's New

## 1. Central version registry

Create `src/lib/versioning.ts` as the single source of truth:

- `APP_VERSION = "1.0.0"`
- `PRIVACY_VERSION = "1.0"`
- `TERMS_VERSION = "1.0"`
- `APP_CHANGELOG`: array of `{ version, date, type: "major" | "minor", title, changes: string[] }`
- `PRIVACY_CHANGELOG` and `TERMS_CHANGELOG`: same shape, scoped to legal docs
- Helper `bumpVersion(current, type)` documenting the rule (minor +0.1, major +1.0) for future updates

Seed each changelog with a `1.0` entry summarizing what's live today (auth, household, tasks, meals, grocery, calendar, habits, finance, AI chat, PWA, WhatsApp, etc.).

## 2. Update Privacy Policy & Terms

Files: `src/pages/PrivacyPolicy.tsx`, `src/pages/TermsOfService.tsx`

- Pull version + effective date from `versioning.ts` (display "Version 1.0 · Effective <date>")
- Add a new bottom section "Version History" rendered from the corresponding changelog (accordion list of version, date, change summary)
- Refresh body content to reflect the platform as it stands today: PWA install, offline caching, WhatsApp OTP & notifications, Lovable AI usage (Gemini/GPT models) for chat/meal/finance/pantry features, Google Calendar OAuth, credit-card recommender, phone verification, role-based access (household admin / platform admin), rate limiting, RLS, JWT validation, data export & deletion contact path, DPDP Act compliance, children's data, and policy-update notification flow tied to versioning

## 3. Settings page additions

File: `src/pages/Settings.tsx` — append two new cards near the bottom (above any danger/sign-out area):

### a. "How to Use Family Desk"
Accordion of step-by-step guides per module, each step has an inline deeplink button (`navigate(path)`):
- Getting started → `/household-setup`, `/onboarding/preferences`, `/members`
- Tasks & Taskmaster → `/taskmaster/today`, `/taskmaster/projects`, `/taskmaster/my-tasks`
- Meals → `/meals`
- Grocery & Pantry → `/grocery`
- Calendar → `/calendar`
- Habits → `/habits`
- Finance → `/finance`, `/finance/transactions`, `/finance/budget`, `/finance/cards`, `/finance/chat`
- AI assistant → opens chat widget
- Account & notifications → `/account-settings`
- Install as app → `/install`

Built as a small data array in `src/lib/howToUse.ts` for easy maintenance.

### b. "What's New"
Renders `APP_CHANGELOG` from `versioning.ts`:
- Header shows current `APP_VERSION` badge
- Accordion (latest first) with date, type badge (major/minor), and bulleted change list
- Footer links: "View Privacy Policy v1.0" → `/privacy`, "View Terms v1.0" → `/terms`

## 4. Header/footer touch-up

Footer (`src/components/layout/Footer.tsx`) — show `App v{APP_VERSION}` next to the existing links so the version is visible everywhere.

## Technical notes

- All data is static TS/JSON in `src/lib/` — no DB migration needed
- Future updates: bump the constant and prepend a new changelog entry; the rule (`+0.1` minor, `+1.0` major) is documented inline
- Reuse existing `Accordion`, `Card`, `Badge`, `Button` primitives — no new deps
- Deeplinks use `react-router-dom` `useNavigate`, consistent with the rest of Settings
- No backend, RLS, or edge-function changes required
