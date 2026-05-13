## Goal

Run a full audit of the 9-layer checklist and produce a pass/fail report with file references and a short fix list. No feature work in this loop — only verification and any one-line corrections needed to make a claim true.

## Method

For each item I'll do one of three checks:

- **C** — code inspection (read the relevant file/component to confirm logic and wiring)
- **R** — runtime check via signed-in preview using the test account (`testuser@dealcompass.test`) to confirm UI/behaviour
- **D** — DB read via `supabase--read_query` to confirm schema/data assumptions

Each layer gets a section in the final report with: item, status (✅ / ⚠️ / ❌), evidence (file:line or screenshot/log), and — if failing — the smallest fix needed.

## Coverage matrix

| Layer | Items | Primary check |
|---|---|---|
| 1 Bottom nav | 5 items | C: `src/components/layout/BottomNav.tsx`, `MoreSheet`, route highlighting; R: mobile + desktop viewport |
| 2 Onboarding | 4 items | C: onboarding step config, `MODULE_SETUP_KEYS`, `useHouseholdPreferences.completed_module_setups`; R: first-visit module modal |
| 3 Meals tonight | 4 items | C: `src/pages/Meals.tsx` "Tonight's dinner" card, AI suggest hook (timeout + retry), "Add ingredients to list" mutation |
| 4 Meals↔Grocery↔Finance | 5 items | C: pantry deduction on "Mark as cooked", `FINANCE_CATEGORIES`, `MemberContributions`, monthly report share; R: spot click |
| 5 Habits | 4 items | C: challenges tab, catalog count (≥7), streak-freeze quota logic, `HabitStackSuggestion` after create |
| 6 Calendar | 4 items | C: `CreateEventDialog` no-Google path, festival rendering on grid, `FestivalBanner`, `matchFestivalChecklist` insert |
| 7 Grocery | 4 items | C: `RunningLowChips`, add-to-list handler, `whatsappShare`, category grouping in `ShoppingListDetailView` |
| 8 Taskmaster | 5 items | C: `RecurrenceSelector`, `markTaskDone` clone logic, `/taskmaster/templates` route, `bulkCreateFromTemplate`, `useSpeechRecognition` + `QuickTaskInput` |
| 9 Dashboard | 4 items | C: `TodaySnapshot`, `FestivalBanner`, module subtitle wiring via `useDashboardSnapshot`, `QuickActionsRow`; R: dashboard render |

## Runtime sweep (R items)

Single signed-in preview pass on mobile viewport:
1. Dashboard → confirm snapshot cards, festival banner state, quick actions open dialogs, AI quick action opens widget.
2. Bottom nav → tap each tab, open More sheet, switch to desktop viewport to confirm hidden.
3. Meals → "Tonight's dinner", AI suggest (wait for 3 results or 30s retry), "Add ingredients" → check Grocery list created.
4. Grocery → Running Low chips, add to list, WhatsApp share text, category grouping.
5. Taskmaster → templates page, recurring task create + complete, voice button tooltip.
6. Habits → challenges tab presence, freeze applied state.
7. Calendar → manual "Add Event" without Google, festival dot.

## Deliverable

Single report grouped by layer with ✅/⚠️/❌ per item, evidence pointers, and a numbered fix list at the end (any ⚠️/❌ that can be corrected with a one- or two-line patch — surfaced for approval before I implement).

## Out of scope

- Building any new feature.
- Restructuring components that already pass.
- Performance/load testing.