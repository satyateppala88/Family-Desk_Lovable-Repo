## Problem

On the Habits → Household tab, the AI Coach Insight always says:

> "Your household is building great consistency! Consider adding a shared family habit like an evening walk or gratitude moment."

This shows even when the household already has one or more shared (`assignment_type = "household"`) habits, which feels disconnected — it suggests adding something the family already has.

## Fix

In `src/pages/Habits.tsx`, the "household-built" branch (lines ~420–425) currently ignores whether any shared habits exist. Branch the copy on `householdHabits.length`:

- **No shared habits yet** (`householdHabits.length === 0`): keep a nudge to add one, but soften it — e.g. *"Your household is building great consistency. Want to add a shared habit everyone tracks together, like an evening walk or gratitude moment?"*
- **One shared habit** (`householdHabits.length === 1`): celebrate the shared habit by name and encourage keeping it going — e.g. *"Nice — '{name}' is your shared family habit. Keeping it consistent together is what builds the routine."*
- **Multiple shared habits** (`householdHabits.length >= 2`): acknowledge the shared set — e.g. *"Your household has {n} shared habits going. Consistency together is the win — keep checking in."*

Use a separate dismiss key per variant (`household-built-empty`, `household-built-one`, `household-built-many`) so dismissing one state doesn't silence a future, more relevant message.

No backend, schema, or other UI changes. Scope is the household-view coach insight block only.
