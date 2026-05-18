## Fix two issues on /habits

### 1. AI Coach Insight "X" does nothing

`src/pages/Habits.tsx` renders `HabitCoachInsight` in 5 places, each with `onDismiss={() => {}}` — a true no-op, so clicking X never updates state.

**Fix:** Track dismissal in local state, keyed per-context + per-day in `localStorage` (same pattern already used for `StreakRecoveryBanner`):

- Add `dismissedCoachKeys: Set<string>` state in `Habits.tsx`, hydrated from `localStorage` on mount with key `habit-coach-dismissed-<userId>-<YYYY-MM-DD>`.
- Give each coach variant a stable id: `empty`, `new-household`, `start-today`, `progress`, `household-empty`, `household-new`, `household-start`, `household-built`.
- When the user clicks X, add the id to the set and persist. Skip rendering the insight if its id is in the set.
- Dismissals auto-expire next day because the storage key includes today's date.

### 2. "Where do household-level habits show?"

Currently:
- `useHabits` already includes `assignment_type === 'household'` habits in every member's `todaysHabits` list (Me tab).
- But `HabitCard` shows no badge, so they look identical to personal habits — users can't tell they created a shared one.
- The Household tab shows aggregate stats and member progress, but no actual list of household habits.

**Fix (UI only, no data changes):**

a. **HabitCard badge** — in `src/components/habits/HabitCard.tsx`, render a small pill next to the habit name when `habit.assignment_type === 'household'` ("Household", `Users` icon) or `'multiple'` ("Shared", `Users` icon). Uses existing semantic tokens (`bg-primary/10 text-primary`).

b. **Household tab "Shared habits" section** — in `Habits.tsx` Household view, add a section above "Today's Summary" listing all habits where `assignment_type === 'household'`, pulled from `allHabits` returned by `useHabits`. Each row: icon, name, frequency, and today's household completion count (members completed / total members). Empty state: "No shared habits yet — create one and tag it 'Whole Household' so everyone sees it."

### Files touched

- `src/pages/Habits.tsx` — dismiss state + storage; new Household-tab "Shared habits" section.
- `src/components/habits/HabitCoachInsight.tsx` — no change (already accepts `onDismiss`).
- `src/components/habits/HabitCard.tsx` — assignment-type badge.

No backend, schema, or hook changes.
