## Goal
Add three feature-discovery surfaces in one pass: refreshed empty-state copy across modules, a one-time per-module nudge banner, and a rotating "Did you know?" tip card on the dashboard.

## 1. Empty-state copy updates (text only)

Update only the `title` / `description` props on existing `EmptyState` instances. No icon, illustration, action, or layout changes.

| File | Location | New title | New description |
|---|---|---|---|
| `src/pages/Tasks.tsx` (~L140) | unfiltered branch | `Nothing on the list yet` (already matches) | `Add your first task and assign it to anyone in the household. FamilyDesk AI can prioritise your list and remind you before things are due.` |
| `src/components/meals/TonightDinnerCard.tsx` (~L22) | empty dinner card | `What's for dinner tonight?` (already matches) | replace `<p>` body with `Tap 'Suggest dinner' and our AI will recommend something based on your pantry and your family's preferences — in seconds.` |
| `src/pages/Meals.tsx` (~L411) | All Recipes empty | `Your recipe collection is empty` (already matches) | `Tap 'Generate Recipes' to get personalised Indian meal ideas for your household. Every suggestion is tailored to your dietary preferences.` |
| `src/pages/Grocery.tsx` (~L622) | pantry empty | `Your pantry is a blank slate` | `Add staples your household always keeps at home. When stock runs low, FamilyDesk will flag it and add items to your shopping list automatically.` |
| `src/pages/Habits.tsx` (~L269) | Me tab empty | `No habits yet` (already matches) | `A small daily action, done consistently, changes everything. Add your first habit and track streaks across your whole household.` |
| `src/pages/FinanceTransactions.tsx` (~L157) | unfiltered branch only | `No expenses logged yet` | `Add your first transaction and FamilyDesk will start building your household's spending picture — by category, by member, by month.` |
| `src/pages/Calendar.tsx` (~L58) | no events | `Your family calendar is clear` | `Add events manually or connect Google Calendar. FamilyDesk will remind you before festivals, birthdays, and anything else that matters to your household.` |

Filtered/secondary empty states (e.g. "No matching tasks", "No active challenges") are left untouched.

## 2. First-use module nudge banner

New shared component `src/components/discovery/ModuleNudgeBanner.tsx`:
- Props: `moduleKey: "tasks" | "meals" | "grocery" | "habits" | "finance" | "calendar"`, `text: string`.
- Style: `bg-[#E8F5F1]` background, 3px left border `#0F6E56`, rounded, p-3, single-line text (truncate), small `X` (lucide) dismiss button top-right. Mounted with margin-bottom so it sits above the page content.
- Persistence: per-user via `localStorage` key `fd_module_nudge_dismissed:<userId>:<moduleKey>`. The user message references `setup_completed_modules` on `profiles`, but no such column exists today and the requirement explicitly says "Do not change … data fetching or authentication logic" — localStorage keeps the change UI-only and per-device, matching the "never show again once dismissed" contract. Calling that out so the user can confirm; if they want server-side persistence, it's a follow-up migration + hook.
- Once dismissed (or already in localStorage), render nothing.

Mount one instance directly below the page header in each module page:
- `src/pages/Tasks.tsx` — `Assign tasks to family members — everyone sees what's theirs, instantly.`
- `src/pages/Meals.tsx` — `Tell us your dietary preferences once and the AI plans meals around them every day.`
- `src/pages/Grocery.tsx` — `Add pantry staples now — FamilyDesk tracks what's running low so you never forget at the store.`
- `src/pages/Habits.tsx` — `Build habits together. Family streaks are harder to break than solo ones.`
- `src/pages/FinanceTransactions.tsx` (Finance landing for transactions; the Finance hub also gets one — see note) — `Log your first expense in 10 seconds. By month-end, you'll have a full household spending report.`
- `src/pages/Calendar.tsx` — `Add a shared event and every household member gets it on their view automatically.`

Note: the Finance "module" is a hub with multiple sub-pages. The nudge will be mounted on the Finance hub page (`src/pages/Finance.tsx`) so it shows on first entry to the module, not buried inside Transactions. Will confirm exact file when implementing.

## 3. Dashboard "Did you know?" tip card

New component `src/components/dashboard/DidYouKnowCard.tsx`:
- 15-tip array (frozen, exactly the order given).
- On mount: read `fd_tip_index` from localStorage (default 0), increment for next session and write back: `next = (current + 1) % 15`. Show `tips[current]`.
- Session-only dismiss tracked via `useState` (no persistence) — disappears for the rest of the page lifecycle, returns next page-load with the next tip.
- Style: white card, full width, subtle 3px green left border `#0F6E56`, sparkle icon (`Sparkles` from lucide) on the left, tip text (single line, truncate on small screens, wraps on larger), `X` dismiss on the right. Themed with existing `Card` primitive plus inline border-left style.

Mount in `src/pages/Index.tsx` between `<TodaySnapshot />` and `<QuickActionsRow />` (i.e. between the Today's Snapshot row and the Module grid as requested — `QuickActionsRow` sits between snapshot and grid; the tip card goes above QuickActions so it's directly under the snapshot and clearly above the module grid).

## Out of scope
- No DB migrations, no changes to RLS, no changes to data fetching or auth.
- No icon/illustration/CTA changes for empty states.
- Filtered empty states and secondary empty states unchanged.
- No analytics events.

## Verification
- Visit each module first time → banner visible; dismiss → reload → still gone.
- Tasks/Habits/Meals/Grocery/Finance/Calendar empty pages → updated copy renders.
- Dashboard → tip card appears under snapshot; reloading cycles tips 1→2→…→15→1; dismiss hides until next reload.