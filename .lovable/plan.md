# Plan: 8 UI/UX fixes

## ⚠️ Conflict to resolve first

**Bottom navigation bar** contradicts a Core project memory: *"Navigation: Hub & Spoke launcher, no bottom nav"* (see also the `App Shell Redesign` memory entry). Reintroducing a persistent bottom nav reverses an explicit design decision.

I'll proceed under one of two options — please confirm which:
- **A. Override the rule.** Add the bottom nav as requested and update the memory to reflect the new direction.
- **B. Keep Hub & Spoke.** Skip this item and leave the launcher untouched.

Defaulting to **A** unless you say otherwise — the rest of the plan assumes A.

---

## 1. Calendar — Add Event creates a manual event (not Google connect)
- New component `src/components/calendar/CreateEventDialog.tsx` — fields: Title (required), Date (required, shadcn DatePicker with `dd/MM/yyyy`), Time (optional), Description (optional), All-day toggle.
- Submits to `calendar_events` via a new `useCreateCalendarEvent` mutation in `src/hooks/useCalendar.ts` (household-scoped, current user as creator, `source = 'manual'`).
- `src/pages/Calendar.tsx`: replace both "Add Event" handlers (EmptyState action and a new header "Add Event" button) so they open `CreateEventDialog` instead of `ConnectCalendarDialog`. The "Connect" button in `CalendarHeader` continues to open `ConnectCalendarDialog`.

## 2. Finance dates → DD/MM/YYYY (en-IN)
- `TransactionDialog`, `FinanceBudget*` target-date pickers, and `FinanceSavings` goal target-date picker: switch any `format(date, 'MM/dd/yyyy' | 'PP')` and native `<input type="date">` displays to `format(date, 'dd/MM/yyyy')` from `date-fns`.
- Use shadcn DatePicker (Popover + Calendar) where currently a native input is used, so the displayed string honours `dd/MM/yyyy`. Storage stays ISO `yyyy-MM-dd`.

## 3. Persistent bottom navigation (pending Option A confirmation)
- New `src/components/layout/BottomNav.tsx`: fixed bottom bar, 5 slots — Home (`/`), Tasks (`/taskmaster/today`), Finance (`/finance`), Habits (`/habits`), More (sheet listing Calendar, Meals, Grocery, Settings).
- Active state uses `text-primary` (brand green `#0F6E56` already mapped to `--primary`); inactive uses `text-muted-foreground`. Icons from lucide-react.
- Mount inside `ProtectedRoute` (or a shared authed layout) so it appears on every authenticated route. Add `pb-16` safe-area padding to `page-container` so content isn't covered.
- Update `App Shell Redesign` memory to record the reversal.

## 4. AI assistant tone — professional, no diminutives
- Append a tone clause to the system prompts in `supabase/functions/ai-chat/index.ts` and `supabase/functions/ai-finance-chat/index.ts`:
  > "Be warm, supportive, and professional. Never use diminutives or pet names such as 'sweetie', 'honey', 'darling', 'dear', 'awww', or similar. Match the tone of a smart, friendly assistant — not a chatbot."

## 5. Remove "What's in my pantry?" quick action
- `src/components/ai/AIChatWidget.tsx`: drop the pantry suggestion chip from the initial-suggestions array.

## 6. Hide empty AI Daily Plan banner
- `src/pages/TaskmasterToday.tsx` (~line 200): wrap the "AI-Generated Draft / Plan Accepted" banner in `dailyPlan && (dailyPlan.items?.length ?? 0) > 0 && (...)` so it disappears when there's nothing to prioritize.

## 7. Onboarding step 1 Back button → `/household-setup`
- `src/components/onboarding/UserPreferencesOnboarding.tsx` (~line 367): on step 0, the Back button should `navigate('/household-setup')`. On later steps, keep the existing "previous step" behaviour.

## 8. Sparkle button tooltip
- Wrap the floating AI launcher button in `src/components/ai/AIChatWidget.tsx` with shadcn `Tooltip` → content: **"Ask FamilyDesk AI"**.

---

## Out of scope / not changing
- DB schema (no new tables; reusing existing `calendar_events`).
- Existing Google Calendar connect flow.
- Other AI tone copy in transactional emails or templates.

## Verification
- Manual smoke via the test account (`testuser@dealcompass.test`) for: create manual event, change a transaction date, navigate via bottom nav, open AI sheet (tooltip + suggestions), Today page with empty plan, onboarding Back from step 1.
- `bun run build` to catch TS errors.
