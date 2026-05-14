## Meals — fix two AI buttons that appear unresponsive

### What I found

Both buttons are wired in code, but each has a silent-failure path that matches the user's report:

1. **"Suggest dinner"** (`TonightDinnerCard` → `Meals.tsx:319`) calls `openAiSheet("dinner")` which only sets `aiSheet.open = true`. The actual `<AiSuggestSheet>` is rendered behind `{householdId && (…)}` at `Meals.tsx:490`. If `householdId` is null at click time (still resolving, or user not yet in a household), the sheet element is never mounted, no spinner shows, and no toast fires — looks like the button does nothing. There is also no in-button loading affordance while the sheet's first fetch is in flight.
2. **"Generate Meal Plan"** (`Meals.tsx:349`) calls `handleGeneratePlan("full")` which guards with `if (!householdId || !user) return;` — same silent-return failure mode. The existing timeout is 30 s (spec says 15 s) and the toast title/copy don't match the spec ("Couldn't generate recipes" → spec wants "Couldn't generate right now — try again").

The per-slot AI flow works because users open it through `AddMealSheet`, which is gated on the same `householdId` check, so by the time it's reachable `householdId` is always non-null.

### What to change

#### A. `src/pages/Meals.tsx` — wrap the "Suggest dinner" handler

- Replace `onSuggest={() => openAiSheet("dinner")}` with a new `handleSuggestDinner` callback:
  - If `!householdId`, show a toast `{ title: "Hang on a sec", description: "Loading your household — try again in a moment." }` and return.
  - Else `openAiSheet("dinner")`.
- Add a new state `suggestingDinner: boolean`. Set it `true` immediately, then flip back to `false` when `aiSheet.open` becomes `true` (the sheet renders its own skeleton). This drives a spinner on the button — the easiest way is to pass an `isLoading` prop into `TonightDinnerCard` and reflect it on the button.
- Wrap in try/catch (the work itself can't really throw, but per spec — surface any error via a toast).

#### B. `src/components/meals/TonightDinnerCard.tsx` — accept `isLoading`

- Add optional `isLoading?: boolean` prop.
- When true: disable the "Suggest dinner" button, replace the leading `Sparkles` icon with a spinning `Loader2`, keep label "Suggest dinner".
- No other UI change.

#### C. `src/pages/Meals.tsx` — tighten `handleGeneratePlan`

- Change the timeout from 30000 to **15000 ms** for the "full" path used by the "Generate Meal Plan" button. Keep the 30 s timeout for the recipes-tab path if you want, but the spec is for this button — I'll just lower it for both since the same handler is shared and a 15 s cap is acceptable.
- Replace the catch-block toast with `{ title: "Couldn't generate right now — try again", variant: "destructive" }` (drop the generic "Couldn't generate recipes" title).
- Add an explicit guard at the top: if `!householdId || !user`, toast `{ title: "Hang on a sec", description: "Loading your household — try again in a moment." }` and return.
- Ensure `setGeneratingPlan(false)` always runs in `finally` (it already does — just confirming the spec's "never leave the button in a permanent loading state" is satisfied).
- Update the button label/spinner: when `generatingPlan` is true, show `Loader2` spinning + "Generating..." (today it shows `Sparkles` + "Creating your plan..."). Use `Loader2` from `lucide-react`.

#### D. Error handling

- Both handlers already use `try/catch`. The change is the **toast copy** (per spec) and the addition of the explicit-guard toast for missing household/user, so users always see feedback.

### Out of scope

- The actual `AiSuggestSheet` component (already shows skeleton/error/retry — works correctly).
- The `suggest-meals-for-slot` and `generate-meal-suggestions` edge functions (working — proven by the per-slot flow).
- The "What's for dinner tonight?" button inside `MealPlanCalendar.tsx` weekly view — that one's already wired via `onAiSuggest` and is not the button the user is reporting.

### Verification

1. Click "Suggest dinner" before household has loaded → see "Hang on a sec" toast (no silent click).
2. Click "Suggest dinner" after household loads → button briefly spins, AI sheet slides up with 3 suggestions. On error inside the sheet, the existing inline error + Retry already covers it.
3. Click "Generate Meal Plan" with no household yet → see "Hang on a sec" toast.
4. Click "Generate Meal Plan" normally → button shows spinner + "Generating...". On success, toast + plan refresh. On failure or > 15 s, toast "Couldn't generate right now — try again" and button re-enables.