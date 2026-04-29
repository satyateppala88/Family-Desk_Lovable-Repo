# Guided Task Completion After Voice / Quick Input

## Problem

When a task is added via the Quick Task input (typed or spoken), the AI parser may leave fields empty or default them silently:

- **due_date** — often null when no date was spoken
- **task_category** — AI guesses, but may pick "other"
- **priority_level** — defaults to 3 (P3 Normal)
- **task_status** — *never set* by `handleQuickCreate`, so the task lands as the DB default (likely `backlog`) and is **invisible on the Today dashboard**
- **project** — never asked
- **assignees** — silently set to just the creator, even though the household shares tasks

Today, the parsed task is created immediately with one click, so the user has no chance to fill these in — that's why some tasks "don't show on the dashboard".

## Solution

After parsing, instead of jumping straight to "Create", open a lightweight **"Complete task details"** sheet that:

1. Pre-fills every field the AI extracted.
2. Highlights the fields the AI **could not determine** (with an "AI didn't catch this — pick one" hint).
3. Forces the user to confirm/select values for the four critical fields before Create is enabled:
   - **Status** (Backlog / Today / In Progress / Blocked)
   - **Category** (Home / Work / Kid / Other)
   - **Priority** (P1–P4)
   - **Due date** (date picker, or explicit "No due date" toggle)
4. Optional fields stay optional but visible: **Project**, **Assignees** (multi-select of household members, defaults to creator).
5. Voice users get a "Speak the answer" mic on each missing field — saying "tomorrow", "high priority", "work", etc. fills that one field via a small follow-up parser call. Tapping a dropdown is always an alternative.

The Create button stays disabled until every required field has an explicit value (not just an AI guess). A small "AI suggested" badge appears next to fields the user hasn't confirmed yet; tapping the field (or confirming via voice) clears the badge.

## User flow

```text
User types / speaks: "Call plumber"
        │
        ▼
[Parse] → AI returns: title="Call plumber", category="home",
                      priority=3, due_date=null, status=null
        │
        ▼
"Complete task details" sheet opens
   Title:    Call plumber                    [edit]
   Category: Home          (AI suggested)    [confirm / change]
   Priority: P3 Normal     (AI suggested)    [confirm / change]
   Status:   ⚠ pick one    [Backlog ▼]
   Due:     ⚠ pick one    [📅] or [No due date]
   Project: optional
   Assignees: You ✓  + add member
        │
        ▼
[Create] enabled only when Status + Due answered
        │
        ▼
createTask runs with full payload → shows up everywhere it should
```

## Scope

### New
- `src/components/taskmaster/TaskCompletionSheet.tsx` — the missing-details sheet (mobile-first bottom sheet, uses existing `Sheet`/`Select`/`Calendar`/`VoiceInputButton`).
- Small helper `src/lib/taskCompletion.ts` to compute which fields are "missing" vs "AI-guessed" and validate readiness.

### Edited
- `src/components/taskmaster/QuickTaskInput.tsx` — replace the inline preview Card + Check button with: parse → open `TaskCompletionSheet` → on confirm call `onCreateTask`. Keep the voice mic on the main input.
- `src/pages/TaskmasterToday.tsx`, `src/pages/TaskmasterTasks.tsx` — `handleQuickCreate` now receives a fully-completed payload (with `task_status`, `assignee_ids`, `project_id`) and passes it through to `createTask.mutate`. Today page should default the suggested status to `today` so newly created tasks immediately appear on the dashboard.
- `src/components/taskmaster/TaskmasterTaskDialog.tsx` — minor: same "AI didn't catch this" highlighting reused if a parsed task is opened via the "Edit before creating" pencil (already wired through `onEditTask`).
- `supabase/functions/parse-task-input/index.ts` — small enhancement: also return `task_status` (allow values: `backlog | today | in_progress`) when input contains hints like "today", "now", "start now", "later"; null when ambiguous. No schema migration needed.

### Not touched
- DB schema, RLS, realtime hook, household-shared-view rule.
- The `TaskmasterTaskDialog` full editor remains the power-user path.

## Field-readiness rules

A task is ready to create when **all** of these are explicitly set by the user (AI suggestions count as set only after user confirms):

| Field      | Required | Default if user picks "skip" |
|------------|----------|------------------------------|
| title      | yes      | —                            |
| status     | yes      | `today` on Today page, `backlog` elsewhere |
| category   | yes      | `other`                      |
| priority   | yes      | `3`                          |
| due_date   | yes (or "no due date" toggle) | null |
| project    | no       | null                         |
| assignees  | no, but pre-checked = creator | [creator] |

## Why this fixes the dashboard issue

The Today dashboard filters tasks by `task_status = 'today'` (and/or due_date = today). Quick-created tasks today never set `task_status`, so they fall into `backlog` and disappear from Today. By making status a required, confirmed field — and defaulting the suggestion to `today` when the user is on the Today page — every quick-added task lands where the user expects.

## Out of scope (can follow up)

- Conversational multi-turn voice flow ("Sure, what priority?" spoken back). The plan uses one sheet with per-field voice mics, which is faster and more accessible than a back-and-forth dialog. Happy to layer a spoken Q&A on top later if you want it.
