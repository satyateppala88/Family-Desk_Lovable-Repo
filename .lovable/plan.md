## Goal

Make every text input in the app voice-capable using **ElevenLabs Scribe** for transcription and **ElevenLabs TTS** for spoken AI replies, upgrade the assistant to **autonomously create tasks** (asking follow-up questions for missing info, answerable by voice or text), and let users upload **profile, household, and family-member photos** that replace the FamilyDesk avatar throughout the app.

---

## Part 1 — Voice everywhere (ElevenLabs Scribe)

### New shared component: `<VoiceInputButton />`
A drop-in mic button that wraps any text field. Records mic audio, sends it to a new edge function, and appends the transcript to the field.

- New edge function `elevenlabs-transcribe` (server-side only, JWT validated, rate-limited):
  - Accepts a short audio blob (multipart/form-data).
  - Calls `https://api.elevenlabs.io/v1/speech-to-text` with `model_id=scribe_v2`, `language_code=eng`, `tag_audio_events=false`.
  - Returns `{ text }`.
- New hook `useVoiceTranscription()` handles `getUserMedia` → `MediaRecorder` (webm/opus) → POST → callback.
- Replace the existing Web Speech API usage in `AIChatWidget` and `AIPantryImportDialog`, and add the new mic button to:
  - `QuickTaskInput` (Taskmaster natural-language input)
  - `TaskmasterTaskDialog` title/description
  - `TaskDialog` (legacy tasks)
  - `HabitQuickAdd`, `HabitCreateDialog`
  - `TransactionDialog`, `BudgetDialog`, `SubscriptionDialog`, `SavingsGoalDialog` (notes/description fields)
  - `FinanceChat` input
  - `CalendarEventDialog` title/notes
  - `ProjectDialog`, `MealPlanDownload` notes, `RecipeRatingDialog` review

### Spoken AI replies (TTS)
- New edge function `elevenlabs-tts`: takes `{ text, voiceId? }`, returns MP3 bytes (proxied through gateway/api). Uses `eleven_turbo_v2_5` for low latency. Default voice: George (`JBFqnCBsd6RMkjVDRZzb`).
- In `AIChatWidget` and `FinanceChat`: track whether the user's *last sent message* came from the mic. If yes, after the assistant stream completes, fetch TTS for the final reply and auto-play it. Otherwise stay silent.
- Show a small speaker pill on every assistant message to play/replay on demand (so typed users still get optional voice).
- Stop playback when the sheet closes or the user sends a new message.

---

## Part 2 — Autonomous task creation via chat

Extend the AI assistant so a user can say *"Create a task to call the plumber"* and the assistant will:

1. **Parse intent** using existing `create_task` tool, but the schema is expanded to also include `assignee_user_id`, `task_category`, `priority_level`, `due_date`, `description`.
2. **Detect missing critical fields** (title, due_date, assignee, priority). If missing, the assistant asks one focused follow-up at a time ("Who should own this?", "When is it due?", "How urgent — P1, P2, P3?"). The user replies by voice or text.
3. **Resolve names → user IDs** server-side using `household_members` + `profiles.display_name` (fuzzy match). If ambiguous, the assistant lists choices.
4. **Create the task** through Taskmaster (`tasks` table used by Taskmaster) once it has the minimum (title + assignee + due_date + priority). Confirms with a success message.

### Backend changes (`supabase/functions/ai-chat/index.ts`)
- Add household roster + display names into the system prompt context so the model can resolve "mom"/"Aman" to a user.
- Add new tools: `list_household_members`, `create_taskmaster_task` (with full field set), `update_taskmaster_task`.
- Implement a tool-execution loop: read streamed `tool_calls`, execute server-side, append `tool` role messages, re-stream the model's next turn. (Currently the function just streams once and never executes tools — this is the main lift.)
- Reuse the validated, household-scoped supabase client already in the function.

### Frontend changes
- `AIChatWidget` already streams content; extend the SSE parser to also surface `tool_calls` deltas so we can show "Creating task…" status chips between turns.
- Add inline confirmation card when a task is created (title + due + assignee), with an Undo button (deletes the just-created task).

---

## Part 3 — Profile, household & family-member photos

### Storage (Lovable Cloud)
New public storage bucket `avatars` with RLS:
- Anyone authenticated can read.
- Users can write to `users/<auth.uid()>/...`
- Household admins can write to `households/<household_id>/...` and `members/<household_id>/<member_id>/...`

### Schema additions
- `households.avatar_url text` (nullable).
- New table `household_family_members` for non-app people the user wants to track (kids, grandparents, pets) with `id`, `household_id`, `display_name`, `relationship`, `avatar_url`, `birthdate`, timestamps. RLS: household members read/write.
  - If a similar table already exists during build, reuse it instead of creating a new one.

### Upload UI
- New component `<AvatarUploader />` (image picker + crop preview using a lightweight 1:1 crop, max 2 MB, resized client-side to 512×512 webp before upload).
- **AccountSettings page**: section "Profile photo" → uploads to `avatars/users/<uid>/avatar.webp`, writes to `profiles.avatar_url`.
- **Settings (Household) page**: new "Household photo" card visible to admins → writes to `households.avatar_url`.
- **Members page**: each app member shows current avatar; admins can add/edit "Family members" (non-app) with avatar + name + relationship.

### Display everywhere
- Update `Header` avatar to use `profiles.avatar_url` (fallback to initials).
- On `/dashboard`, show household photo as a small chip next to the household name; if absent, keep current FamilyDesk wordmark.
- Member chips in Taskmaster, Habits leaderboard, Calendar legend, FamilyPulse, MemberProgressCard → use `avatar_url`.
- Add a `useHouseholdRosterWithAvatars` hook that joins `household_members → profiles` plus `household_family_members` so all member-list UIs can switch in one place.

---

## Technical Details

- **Audio capture**: `MediaRecorder` with `audio/webm;codecs=opus`, max 60 s per take, push-to-talk button (hold to record on mobile, click-to-toggle on desktop).
- **ElevenLabs key**: present (`ELEVENLABS_API_KEY` will be added via `add_secret` if missing — current secrets list does NOT include it; we will request it from the user before deploying the two new functions).
- **TTS streaming**: use `/v1/text-to-speech/{voice}/stream?output_format=mp3_44100_128`; pipe response body straight back to the client and play with `<audio>`.
- **Tool loop in ai-chat**: switch from "stream pass-through" to "non-streaming first turn → execute tools → stream final turn". Keeps UX similar; spinner shows during tool execution.
- **Image processing**: client-side `createImageBitmap` + `OffscreenCanvas` resize to 512 px square webp (quality 0.85). No server processing needed.
- **Storage policies**: `INSERT`/`UPDATE`/`DELETE` policies on `storage.objects` checking `bucket_id = 'avatars'` and path prefix matches `auth.uid()` or `has_household_role(auth.uid(), <hh>, 'admin')`.

---

## Out of scope
- Wake-word / always-on listening.
- Real-time bidirectional voice chat (ElevenLabs Agents). We use one-shot STT + TTS, which is cheaper and matches the requested UX.
- Editing/cropping tools beyond a simple square crop.

---

## Confirmation needed before build
We will request `ELEVENLABS_API_KEY` via the secret prompt when implementation starts (the existing secrets list does not include it). All other infrastructure (Lovable Cloud, Resend, etc.) is already in place.