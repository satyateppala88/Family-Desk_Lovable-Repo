## E-07 — Habit Challenges, Streak Freeze & Stacking Suggestions

### Change 1 — Household Habit Challenges

**New tab.** Habits page tabs become **Me / Household / Challenges**. A `useChallenges` hook drives the new tab.

**Catalog.** Pre-built challenges live in a static client file `src/data/challengeCatalog.ts`:

```ts
{ id: "walk-together", emoji: "🚶", name: "Walk Together",
  description: "Every adult walks 30 minutes daily",
  durationDays: 7, scope: "all_adults" }
// + the other 6 from the prompt, with 7d or 21d durations
```

**Schema (one migration):**

```text
household_challenges
  id, household_id, template_id text, name text, emoji text,
  duration_days int, start_date date, end_date date,
  status text default 'active'  -- active | completed | abandoned
  started_by uuid, created_at

challenge_participants
  id, challenge_id uuid, user_id uuid, joined_at, UNIQUE(challenge_id,user_id)

challenge_logs
  id, challenge_id, user_id, log_date date, completed bool default true,
  created_at, UNIQUE(challenge_id,user_id,log_date)
```

RLS: members of the challenge's `household_id` can SELECT all three; users INSERT their own `challenge_logs` and `challenge_participants` rows; admins can `UPDATE` `household_challenges.status` (abandon/complete). All policies via existing `is_household_member()` SECURITY DEFINER helper.

Why a separate `challenge_logs` table instead of reusing `habit_logs`: keeps streak math, scoring, and the existing "Me" habit list untouched; challenges can run in parallel with personal habits without polluting them.

**Components:**

- `src/components/habits/ChallengePickerSheet.tsx` — bottom sheet with the 7 templates as cards, each with a "Start (7 days)" / "Start (21 days)" button (uses `durationDays` from catalog). On confirm, inserts a `household_challenges` row and a `challenge_participants` row for the creator.
- `src/components/habits/ChallengeCard.tsx` — used in both the Challenges tab (full size) and pinned on Me tab (compact variant via `compact` prop):
  - Header: emoji + name + `Day X of Y`.
  - Progress ring (existing `Progress` primitive in a circular wrapper) showing today's `participants_completed / participants_total`.
  - Member-by-member row of avatars with a ✓ or ○ badge for today.
  - Days remaining counter pill.
  - "Mark today done" button (inserts `challenge_logs` for current user, today). If already done shows a check.
  - "Invite family to join" button — calls a new edge function `notify-challenge-invite` that uses the existing `dispatch_push` infra to ping non-participants.
- `src/hooks/useChallenges.ts` — fetches active challenges, today's logs, participants; exposes `joinChallenge`, `markDone`, `startChallenge`, `inviteMembers`.

**Pinned in Me tab.** When `useChallenges().userActiveChallenges.length > 0`, render `<ChallengeCard compact />` at the very top of the Me tab habit list (above the Progress summary card), visually separated by a subtle divider and a "Family Challenges" label.

**Edge function** `supabase/functions/notify-challenge-invite/index.ts`:
- JWT auth + Zod (`challengeId`).
- Verifies caller is a household member of the challenge's household.
- Looks up household members not in `challenge_participants`, calls existing `dispatch_push` SQL helper or directly invokes `send-push` for each.

### Change 2 — Streak Recovery (Forgiveness)

**Schema (same migration):**

- `profiles`: add `streak_freezes_remaining int default 1`, `streak_freeze_period text` (yyyy-MM, the period the count belongs to), `last_freeze_used_at timestamptz`.
- `habit_logs`: add `is_freeze boolean default false`.

**Replenishment.** Done lazily client-side: when reading the profile, if `streak_freeze_period !== current yyyy-MM`, the `useStreakFreeze` hook UPDATEs `streak_freezes_remaining=1, streak_freeze_period=<current month>`. (No cron needed — covers anyone who logs in that month; profile RLS already allows self-update.)

**"Missed yesterday" detection.** New hook `useMissedHabitsYesterday` runs after habits load:
- Yesterday = `subDays(today, 1)`.
- Pulls user's `habit_streaks` where `current_streak > 0` AND (`last_completed_date IS NULL OR last_completed_date < yesterday`) AND the habit was scheduled yesterday (using existing `frequency_type`/`frequency_days`).
- If at least one match, render a `StreakRecoveryBanner` at the top of the Me tab listing the affected habit with the largest `current_streak`.

**Banner component** `src/components/habits/StreakRecoveryBanner.tsx`:
- Copy: "You missed yesterday — use your streak freeze to protect your X-day streak?" plus context line listing the habit name(s).
- "Use Freeze" button: disabled if `streak_freezes_remaining === 0` (shows "0 freezes left this month — try again next month").
- "Let it reset" dismisses for the day (localStorage key `streak-banner-dismissed-<userId>-<yyyy-MM-dd>`).

**Use Freeze action** in `useStreakFreeze.applyFreeze(habitIds[])`:
1. For each affected habit: insert a synthetic `habit_logs` row `{habit_id, user_id, log_date: yesterday, completed: true, is_freeze: true, notes: 'Streak freeze used'}` (UNIQUE handles re-runs).
2. Update `habit_streaks.last_completed_date = yesterday` for each. Streak count is preserved as-is (since `current_streak` was the count *up to the prior gap*, and tomorrow's normal log will increment it).
3. Decrement `profiles.streak_freezes_remaining`, set `last_freeze_used_at = now()`.
4. Toast: "❄️ Streak protected".

**Snowflake render.** `HabitCard` already shows streak history (or will). We surface freeze days by reading `is_freeze` from `habit_logs` and showing a ❄️ chip in any per-day strip. (If no per-day strip exists today, scope-limit to a small "❄️ used yesterday" annotation under the streak count.)

**Freeze badge.** Shown next to the page heading: `❄️ {n} freeze{s} left this month` (always rendered; muted style when 0).

### Change 3 — Habit Stacking Suggestions

Pure client-side, no schema/edge changes.

**Suggestions map** `src/data/habitStackSuggestions.ts`:

```ts
export const HABIT_STACK_SUGGESTIONS: { match: RegExp; suggestions: string[] }[] = [
  { match: /walk|run|jog/i, suggestions: ["5 min stretching", "8 glasses water"] },
  { match: /read/i,           suggestions: ["No screens 30 min before bed", "5 min stretching"] },
  { match: /meditat|mindful/i,suggestions: ["Gratitude journal", "Deep breathing"] },
  { match: /water|hydrate/i,  suggestions: ["Morning walk", "5 min stretching"] },
  { match: /journal|gratitude/i, suggestions: ["Meditate", "Read 10 pages"] },
  // fallback returns ["8 glasses water", "5 min stretching"]
];
```

**Trigger.** `Habits.tsx` already calls `createHabit.mutate(data)`. We:
1. Capture the just-created name in component state on mutate `onSuccess`.
2. Render `<HabitStackSuggestion name={lastCreated} onPick={...} onDismiss={...} />` in a small Card directly below the create button.
3. Suggestion picks calls `setPrefillName(suggestion)` and reopens `HabitCreateDialog` with the form pre-filled.
4. State clears once dismissed or another habit is created. Only ever shown once per creation (a `dismissed` set of names).

**Dialog change.** `HabitCreateDialog` accepts an optional `defaultName` prop and, when provided, sets that on the form (and opens automatically via a `controlledOpen` prop). All other fields keep their existing defaults — the user adjusts assignment/frequency before saving.

### Files

**Migration (one):**
- New tables `household_challenges`, `challenge_participants`, `challenge_logs` + RLS.
- Add `streak_freezes_remaining`, `streak_freeze_period`, `last_freeze_used_at` to `profiles`.
- Add `is_freeze boolean default false` to `habit_logs`.

**New:**
- `src/data/challengeCatalog.ts`
- `src/data/habitStackSuggestions.ts`
- `src/hooks/useChallenges.ts`
- `src/hooks/useStreakFreeze.ts`
- `src/hooks/useMissedHabitsYesterday.ts`
- `src/components/habits/ChallengePickerSheet.tsx`
- `src/components/habits/ChallengeCard.tsx`
- `src/components/habits/StreakRecoveryBanner.tsx`
- `src/components/habits/HabitStackSuggestion.tsx`
- `supabase/functions/notify-challenge-invite/index.ts`

**Edited:**
- `src/pages/Habits.tsx` — three-tab bar; pinned challenge on Me; streak banner; freeze badge in heading row; stacking suggestion render.
- `src/components/habits/HabitCreateDialog.tsx` — accept `defaultName` + `controlledOpen` props.
- `src/types/habits.ts` — add Challenge / ChallengeLog types.

### Out of scope

- Custom user-defined challenges (catalog only, per spec).
- Multi-freeze plans (strictly 1/month per spec).
- Retroactive freeze for days >1 day in the past (only "yesterday").
- Challenge analytics dashboards (kept lightweight; just live progress).