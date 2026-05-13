## Scope

Three additions to Taskmaster: recurring tasks (with auto-regeneration on completion), a Templates page with five pre-built task sets, and small polish on the existing voice input.

---

## CHANGE 1 — Recurring tasks

The `tasks` table already has `recurring boolean` and `recurring_pattern jsonb`. Reuse them — no schema change.

### Recurrence shape stored in `recurring_pattern`
```json
{ "type": "monthly", "config": { "day": 25 } }
// type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
// config.weekday: 0–6 (weekly)
// config.day: 1–31 | "last" (monthly / quarterly)
// quarterly = monthly with interval 3
// yearly: anchored to original due_date month+day
```

### Form additions (TaskCompletionSheet + TaskmasterTaskDialog)
- Add a "Repeat" select: None (default) / Daily / Weekly / Monthly / Quarterly / Yearly.
- Conditional secondary control:
  - Weekly → day-of-week select (default = today's weekday).
  - Monthly / Quarterly → day select (1, 5, 10, 15, 20, 25, Last day).
  - Yearly → no extra control (anchors to chosen due date).
- New helper file `src/lib/recurrence.ts`:
  - `RecurrencePattern` type.
  - `nextOccurrence(pattern, fromDate)` returns the next Date (handles Feb / 31 → last-day clamping, "last" day, weekly weekday alignment).
  - `describeRecurrence(pattern)` for inline label ("Repeats monthly on the 25th").
- Extend `CompletionDraft` with `recurring: boolean` and `recurring_pattern: RecurrencePattern | null`. Persist via existing create flow (already passes through to `tasks.insert`).

### Auto-regenerate on completion
- New helper `cloneTaskAsNextOccurrence(task)` in `src/lib/recurrence.ts` returns a `Partial<TaskmasterTask>` with new `due_date = nextOccurrence(pattern, prevDue ?? today)`, `task_status: "backlog"`, `started_at: null`, `completed_at: null`, `source_calendar_event_id: null`, and copies title/description/category/priority/project/recurring/recurring_pattern.
- In `useTaskmaster.ts → markTaskDone.mutationFn`: after the update, fetch the row back, and if `row.recurring && row.recurring_pattern`, insert a new task with the cloned shape and copy assignees (read existing `task_assignees`, insert duplicate rows for the new id). Wrapped in try/catch so a clone failure doesn't fail the completion. Toast becomes "Task completed — next one scheduled for {date}" when recurrence is active.
- The same path runs whether completion is triggered from `TaskCard`, `TaskmasterTasks`, `TaskmasterToday`, or the completion sheet — they all flow through `markTaskDone`.

### List indicator
- `src/pages/TaskmasterTasks.tsx` (table view), `TaskmasterToday.tsx`, `TaskmasterMyTasks.tsx`, `TaskmasterProjectDetail.tsx`: render a small `Repeat` lucide icon (↺) inline next to `task.title` when `task.recurring` is true, with `title={describeRecurrence(task.recurring_pattern)}`.

---

## CHANGE 2 — Household task templates

### Catalog
- New `src/data/taskTemplates.ts` exporting `TASK_TEMPLATES: TaskTemplate[]` for Month-end Checklist, Festival Prep — Diwali, Festival Prep — Holi, New Home Setup, School Term Start.
- Each template item: `{ title, category?: TaskCategory, priority?: 1-4, dueOffsetDays?: number, recurring?: RecurrencePattern }`.
- For Month-end Checklist, set monthly recurrence on bill/EMI tasks (LPG → 25th, school fees → 5th, electricity → "last").
- For festival templates, dueOffsetDays anchored to the festival date when known via `useUpcomingFestival`; otherwise no due date.

### Templates page
- New route `/taskmaster/templates` → `src/pages/TaskmasterTemplates.tsx`. Add to App.tsx routes and to `TaskmasterSubNav` (`{ path: "/taskmaster/templates", label: "Templates", icon: LayoutTemplate }`).
- Layout: 1-col mobile / 2-col desktop grid of template cards. Each card shows title, item count, brief description.
- Tapping a card opens `TemplatePreviewSheet` (bottom sheet):
  - Editable list of tasks (title input, delete row button, "+ Add task" row).
  - Project name input pre-filled with template name.
  - "Use Template" button on the right.
- New hook helper in `useTaskmaster.ts`: `bulkCreateFromTemplate({ projectName, items })` — creates a project (uses existing `useProjects`/insert), then bulk-inserts tasks with `project_id`, default assignee = current user, copies `recurring` + `recurring_pattern` per item, and computes `due_date` from `dueOffsetDays`. Single toast: "{N} tasks added to {project name}".
- After confirmation, navigate to `/taskmaster/projects/{newId}`.

---

## CHANGE 3 — Voice input polish

The button (`VoiceInputButton` + `useSpeechRecognition`) already wraps the Web Speech API and is wired into `QuickTaskInput`. Gaps to close:

- **5-second auto-timeout**: in `useSpeechRecognition.start`, set `setTimeout(stop, 5000)` (clear on `onend`/`onerror`/`stop`). Configurable via a `maxDurationMs` option; default 5000 in the QuickTaskInput call site, leave `continuous` callers (description textarea) untouched.
- **"Listening…" indicator**: render a small live pill below the input in `QuickTaskInput` when `isListening` is true ("Listening…" with a pulsing dot). Easiest: lift `isListening` via a new optional `onListeningChange` callback exposed by `VoiceInputButton`.
- **"Transcribed — check and confirm" toast**: in `QuickTaskInput`, fire `toast({ title: "Transcribed — check and confirm" })` once when a non-empty transcript arrives.
- **iOS hint**: in `VoiceInputButton`, when `isSupported === false` AND user-agent is iOS, render a small `Info` button with `Tooltip`: "Voice input works best on Chrome for Android." Today the component returns `null` on unsupported — change to render a disabled mic with the tooltip on iOS only.

No backend, no permission flow changes (existing `usePermissionPrimer` stays).

---

## Files

**New**
- `src/lib/recurrence.ts`
- `src/data/taskTemplates.ts`
- `src/pages/TaskmasterTemplates.tsx`
- `src/components/taskmaster/TemplatePreviewSheet.tsx`
- `src/components/taskmaster/RecurrenceSelector.tsx`

**Edited**
- `src/components/taskmaster/TaskCompletionSheet.tsx` — Repeat field + persist.
- `src/components/taskmaster/TaskmasterTaskDialog.tsx` — Repeat field + persist.
- `src/lib/taskCompletion.ts` — extend `CompletionDraft` with recurrence.
- `src/hooks/useTaskmaster.ts` — auto-clone next occurrence on `markTaskDone`; add `bulkCreateFromTemplate`.
- `src/components/taskmaster/TaskmasterSubNav.tsx` — add Templates entry.
- `src/App.tsx` — add `/taskmaster/templates` route.
- `src/pages/TaskmasterTasks.tsx`, `TaskmasterToday.tsx`, `TaskmasterMyTasks.tsx`, `TaskmasterProjectDetail.tsx` — ↺ icon next to recurring titles.
- `src/components/taskmaster/QuickTaskInput.tsx` — listening pill + toast.
- `src/hooks/useSpeechRecognition.ts` — 5s auto-timeout option.
- `src/components/voice/VoiceInputButton.tsx` — iOS unsupported tooltip; expose `onListeningChange`.

## Out of scope
- Cron-based pre-generation of recurring tasks ahead of time (we only generate the next instance on completion, matching the spec).
- Editing recurrence rule on already-completed instances retroactively.
- Per-template translation/localisation.
- Server-side speech recognition fallback for iOS Safari.