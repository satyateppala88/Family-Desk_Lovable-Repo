## E-06 — Monthly Report Card

### New page: `/finance/report`

Auto-generates a shareable monthly summary for the household. Defaults to the **previous month** (because the prompt frames this as a recap), with a month switcher to view earlier months.

### Layout

```text
┌──────────────────────────────────────────────────┐
│  ← Back            Monthly Report      [Share]   │
│  {Household name} · {Month Year}                 │
├──────────────────────────────────────────────────┤
│  ┌────────┬────────┬────────┬────────┐           │
│  │ Spent  │ Saved  │ Habits │ Meals  │           │
│  │ ₹X     │ ₹X     │  X%    │ X days │           │
│  └────────┴────────┴────────┴────────┘           │
│                                                  │
│  Top categories                                  │
│  [Bar chart — top 3 categories with ₹ amounts]   │
│                                                  │
│  Habits                                          │
│  "X of Y habits completed — best streak Z days"  │
│                                                  │
│  Meals                                           │
│  "Cooked at home X days this month"              │
│                                                  │
│  Tasks                                           │
│  "X tasks completed together"                    │
│                                                  │
│  ─────────────────────────────                  │
│  {AI motivational footer line}                  │
└──────────────────────────────────────────────────┘
```

The whole card lives inside a single `ref`-bound `<section id="report-card">` styled with brand cream `#F1EFE8` background and green `#0F6E56` accents — used as the canvas for image export.

### Data sources (all read-only, household-scoped)

| Stat | Source |
|---|---|
| Total spent | `useFinanceMonthlySummary(householdId, month).expenses` |
| Total saved | `summary.income - summary.expenses` (same hook) |
| Top 3 categories | `summary.categoryBreakdown` → sort desc, take 3, label via `resolveCategoryLabel` (alias-aware) |
| Habits % | `habit_logs` for the month: `completed=true count / scheduled count`. Scheduled = number of (habit × eligible day) pairs in month considering `habits.frequency_type` and `frequency_days`. |
| Best streak | `MAX(habit_streaks.longest_streak)` for habits in the household where `last_completed_date` falls within month; fall back to all-time `longest_streak` if month-specific isn't tractable. |
| Meals cooked at home | `COUNT(DISTINCT scheduled_date)` in `meal_plan_items` joined to month's `meal_plans`, filtered by `cooked_at IS NOT NULL` (new column — see migration below). |
| Tasks completed | `tasks` where `household_id = X AND status = 'completed' AND completed_at` (or `updated_at` if no `completed_at`) within month range. |
| Household name | `useHousehold().householdName` |

A new aggregator hook `src/hooks/useMonthlyReport.ts` wraps the per-section queries and returns one normalized payload `{ household, month, spent, saved, topCategories, habits: {completed, total, percent, bestStreak}, mealsCooked, tasksCompleted }`.

### AI motivational footer

New edge function `supabase/functions/monthly-report-tagline/index.ts`:
- Auth-protected (validate JWT + household membership).
- Input (Zod): `{ householdId, month, stats }` — accepts the already-computed numbers so AI sees real values without re-querying.
- Calls Lovable AI Gateway, model `google/gemini-3-flash-preview`, non-streaming.
- System prompt: warm, supportive Indian-family voice; one sentence; no emoji spam (≤1 if any); ≤140 chars.
- Returns `{ tagline: string }`. Frontend caches via React Query keyed on `(householdId, month)` with `staleTime: 24h` so re-renders don't burn credits.
- Fallback if call fails: a deterministic encouraging line picked from a small client-side array.

### Share button

Top-right of the page header. Uses the standard share flow:

1. **Try image share first** (mobile-friendly): render the `<section id="report-card">` to a PNG with the lightweight `html-to-image` library (added via `bun add html-to-image`). Build a `File` and call `navigator.share({ files: [file], title, text })` if `navigator.canShare({ files })` is true.
2. **Otherwise text + URL share**: `navigator.share({ title, text: textSummary, url })`.
3. **Fallback** (desktop browsers without Web Share): `navigator.clipboard.writeText(textSummary)` + sonner toast `"Copied!"`.

`textSummary` is a plain-text version: household name, month, the 4 headline stats, top 3 categories, habits/meals/tasks lines, AI tagline, and a trailing `https://familydesk.in` URL. All on separate lines, WhatsApp-friendly.

### Auto-generation on the 1st

A new pg_cron job runs **at 00:30 IST on day 1 of each month**, calling a tiny edge function `prewarm-monthly-report` that, for each household with finance enabled, hits the tagline edge function for the previous month. This pre-warms the AI tagline cache so when a user opens the report it loads instantly. We do **not** persist a snapshot — the report is computed on-demand from live tables, which keeps it correct if data changes later.

(Skipping a heavy "snapshot to a new table" approach: `finance_monthly_snapshots` already exists for finance numbers, but the report spans Habits/Meals/Tasks too. Live computation is simpler and the data is small.)

### Hub + nav entry points

1. **Finance hub grid** (`src/pages/Finance.tsx`): add a 9th card `Report → /finance/report` with `FileBarChart` icon, label "Monthly Report", description "Shareable recap".
2. **Profile menu** (`src/components/layout/Header.tsx`): add a `DropdownMenuItem` "Monthly Report" that navigates to `/finance/report`. Insert it above the "How to use" item.
3. **App router** (`src/App.tsx`): register `/finance/report → <FinanceReport />` inside the existing finance routes block.

### Files

**New**
- `src/pages/FinanceReport.tsx` — page + share logic.
- `src/components/finance/ReportCard.tsx` — the printable/shareable card (wrapped in the export-target `<section>`).
- `src/components/finance/ReportShareButton.tsx` — handles canShare / clipboard fallback.
- `src/hooks/useMonthlyReport.ts` — aggregator query.
- `src/hooks/useReportTagline.ts` — calls the tagline edge function with caching.
- `supabase/functions/monthly-report-tagline/index.ts` — JWT-validated edge function.
- `supabase/functions/prewarm-monthly-report/index.ts` — cron-triggered pre-warm.

**Edited**
- `src/pages/Finance.tsx` — add "Monthly Report" card to the module grid.
- `src/components/layout/Header.tsx` — add menu item.
- `src/App.tsx` — register the route.

**Migration (one)**
- `meal_plan_items` — add nullable `cooked_at timestamptz`. Backfill from latest `pantry_item_usage.used_at` per `meal_plan_item_id` so historical "cooked" meals still count. Update `MarkAsCookedDialog` flow in `src/pages/Meals.tsx` to set `cooked_at = now()` alongside the existing pantry deduction.

**Cron** (via supabase-insert tool, not migration, per project convention)
- Schedule `prewarm-monthly-report` at `30 18 1 * *` UTC = `00:00 IST day 1` (close enough; precise IST is 19:00 UTC on the 30th of the prior month for 00:30 IST — final cron expression to be set when inserting).

### Out of scope

- Persisting full report snapshots to a new table (live compute is enough; finance data already snapshotted separately).
- WhatsApp template send for the report (the existing utility templates don't cover this; would need new approval).
- Per-member breakdowns inside the report (the new hub-level "Member contributions" already covers monthly income split).
- Historical PDFs / email delivery — the prompt only asks for in-app share.