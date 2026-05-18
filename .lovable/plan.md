## F-23 — Privacy Mode, Finance PIN, Idle Auto-lock

Implement in the order the spec mandates. Each step is independent enough to verify before moving on.

### Discovery summary

- `formatINR` / `formatINRCompact` live in `src/lib/formatINR.ts` and are called from 17 files (all finance pages, dashboard snapshot, transaction/report cards, report share, etc.).
- App shell uses `src/components/layout/Header.tsx` everywhere; Home (`src/pages/Index.tsx`) and Finance hub (`src/pages/Finance.tsx`) both render `<Header />`.
- Existing settings live in `src/pages/Settings.tsx`. Note: `<PrivacySection />` there today is just a *legal* "Privacy Policy" link — the new "Privacy & Security" section is a different block; we add it without removing the legal one (rename the legal one's heading if collision is visible).
- App is wrapped in `QueryClientProvider` → `TooltipProvider` → `AuthProvider` inside `src/App.tsx`. New context slots in below `AuthProvider` so we get the user, before `Routes`.

### Part 1 — Privacy Mode foundation + rollout

**New: `src/contexts/PrivacyModeContext.tsx`**
- State: `isPrivate: boolean`, `togglePrivacy()`, `setPrivacy(v)`.
- Init from `sessionStorage.getItem('familydesk_privacy_mode') === '1'`.
- Persist on change to sessionStorage. Expose via `usePrivacyMode()`.
- Wrap inside `AuthProvider` in `src/App.tsx` so all routes see it.

**New: `src/components/shared/PrivateValue.tsx`**
- Props: `value: string | number`, `prefix?: string` (default `"₹"`), `mask?: string` (default `"••••"`), `className?: string`.
- When private → render `<span aria-label="hidden">{prefix} {mask}</span>` (or just mask if `prefix===""`).
- When not private → if `value` is a number, format via `formatINR`; if string, render as-is with prefix.
- Also export `<PrivateText>` (no prefix) for descriptions / goal names.

**New: `src/components/shared/PrivacyToggle.tsx`** — eye / eye-off button used in headers and settings row.

**New: `src/components/shared/PrivacyBanner.tsx`** — fixed top strip (`#2C2C2A`, white text, 32 px) shown only when `isPrivate`; click toggles off. Mount once in `src/App.tsx` above `<Routes>`. Sits above page content; pages already use their own headers, so we offset with `padding-top` only when banner active via a small layout effect (or simpler: render inline at top of body and let normal flow push content).

**Headers**
- `src/components/layout/Header.tsx` accepts existing avatar slot; add `<PrivacyToggle />` rendered to the left of the avatar so it appears on every page (Home + Finance both use Header, single change covers both). If the spec's "only Home + Finance" matters, gate via `showPrivacyToggle` prop and pass on those two pages. Plan: render unconditionally — visible toggle on all pages is harmless and matches mental model.

**Rollout — replace `formatINR(x)` calls with `<PrivateValue value={x} />`** in the 17 files listed. Targets that must be masked per spec:
- Home (`Index.tsx`) — Income/Spent/member rows.
- Finance hub (`Finance.tsx`) — Income/Expense cards, member contributions.
- Transactions list (`FinanceTransactions.tsx`) — amount + description (use `PrivateText` for description).
- Budgets (`FinanceBudget.tsx`, `FinanceBudgetAnnual.tsx`) — planned/spent.
- Savings (`FinanceSavings.tsx`) — name (PrivateText), target, saved.
- Subscriptions, Cards, Trends, MonthlyReview, DailySpendChart, MemberContributions, CardRecommender, Report cards.
- `useDashboardSnapshot.ts` produces strings consumed in Home — keep raw numbers in the hook, mask only at render side to keep logic untouched.

Category names, calendar/tasks/habits, member names: untouched.

### Part 2 — Finance PIN lock

**New: `src/lib/financePin.ts`**
- `hashPin(pin: string): Promise<string>` using `crypto.subtle.digest('SHA-256', ...)`.
- `getStoredHash() / setStoredHash(h) / clearStoredHash()` against `localStorage['familydesk_finance_pin_hash']`.
- `isPinEnabled()`, `verifyPin(pin)`.
- Session unlock: `markUnlocked()` writes `Date.now()` to `sessionStorage['finance_unlocked_at']`; `isUnlocked(idleMs)` compares against idle timeout.

**New: `src/components/finance/PinKeypad.tsx`** — 4-digit boxes + on-screen numeric keypad (also accepts hardware keyboard); used both for entry and for set/confirm.

**New: `src/components/finance/FinancePinGate.tsx`**
- Reads enabled flag + unlock state.
- If not enabled or unlocked → render `children`.
- Else → show full-screen lock UI: FamilyDesk wordmark, "Enter PIN to access Finance", `PinKeypad`, "Forgot PIN?" → modal with reset instructions, shake + "Incorrect PIN" on bad attempt.
- Wrap every `/finance*` route in `src/App.tsx` with `<FinancePinGate>` — single place to edit.

**Set / change / disable PIN flows** live inside Settings → Privacy (Part 4) as dialogs that reuse `PinKeypad` for current + new + confirm.

### Part 3 — Idle auto-lock

**New: `src/hooks/useIdleAutoLock.ts`**
- Reads `localStorage['familydesk_idle_timeout']` (minutes; default `5`; `'never'` disables).
- Attaches passive listeners for `mousedown`, `touchstart`, `keydown`, `scroll` to `document`; resets a `setTimeout` ref on each.
- On fire: `setPrivacy(true)`, clear `finance_unlocked_at`, toast `"Screen locked due to inactivity"` (3s), and if current path matches `/finance` the `FinancePinGate` re-renders into locked state automatically (since unlock TS now stale).

**Mount:** new component `<IdleAutoLockRunner />` rendered inside `PrivacyModeProvider` in `App.tsx`. Reads context + router location; no UI of its own.

### Part 4 — Settings → Privacy section

**New: `src/components/settings/PrivacySecuritySection.tsx`** rendered in `src/pages/Settings.tsx` near the existing legal `PrivacySection` (rename the legal one's *displayed* heading to "Legal" if both end up adjacent, to avoid duplicate "Privacy" labels).

Rows:
1. **Privacy Mode** — `Switch` bound to `usePrivacyMode()`.
2. **Finance PIN Lock** — `Switch` + adjacent "Set PIN" / "Change PIN" button. Switch flow: on→`SetPinDialog` (enter + confirm). Off→`VerifyPinDialog` then clear hash. "Change PIN" → verify current then set new.
3. **Auto-lock after** — `Select` with `1m / 2m / 5m / 10m / Never`, writes `localStorage['familydesk_idle_timeout']`. `useIdleAutoLock` reads via a small reactive subscription (custom event on write) so changes apply immediately.

### Files touched (summary)

New:
- `src/contexts/PrivacyModeContext.tsx`
- `src/components/shared/PrivateValue.tsx`
- `src/components/shared/PrivacyToggle.tsx`
- `src/components/shared/PrivacyBanner.tsx`
- `src/components/shared/IdleAutoLockRunner.tsx`
- `src/lib/financePin.ts`
- `src/components/finance/PinKeypad.tsx`
- `src/components/finance/FinancePinGate.tsx`
- `src/components/settings/PrivacySecuritySection.tsx`
- `src/hooks/useIdleAutoLock.ts`

Edited:
- `src/App.tsx` — add `PrivacyModeProvider`, `<PrivacyBanner />`, `<IdleAutoLockRunner />`, wrap `/finance*` routes with `<FinancePinGate>`.
- `src/components/layout/Header.tsx` — add `<PrivacyToggle />`.
- `src/pages/Settings.tsx` — render new section.
- All 17 files calling `formatINR` — swap raw rupee renders for `<PrivateValue value={n} />`. No logic changes.

### Explicitly out of scope

- No DB schema changes. PIN hash + idle timeout live in localStorage; privacy mode in sessionStorage.
- No changes to existing finance logic, calculations, or layouts beyond swapping the render call.
- No PIN lockout / brute-force throttling (spec defers this).
- No password-recovery flow; "Forgot PIN?" only links to Settings instructions.

### Verification

After each part:
1. Toggle eye on Home → all amounts on Home + Finance hub show `₹ ••••`; tasks/calendar/habits unchanged.
2. Set 4-digit PIN in Settings → navigate to `/finance` from any other module → PIN screen blocks content; correct PIN unlocks for the session.
3. Set auto-lock to 1 min → leave idle → toast appears, amounts blur, `/finance` requires PIN again.
4. Refresh tab → privacy mode resets (sessionStorage), PIN setting persists (localStorage), Finance requires PIN again (sessionStorage cleared).