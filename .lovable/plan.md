## Goal

Rebuild the AI advisor context architecture so every AI call receives a structured, module-scoped snapshot of household data before the user's question — replacing the current thin/generic prompts and the duplicated finance-only context block.

## Architecture decision: build context **server-side**, not client-side

The spec proposes `src/utils/buildAIContext.ts` (client), but:

- The project already calls the Lovable AI Gateway from **edge functions** (`ai-chat`, `ai-finance-chat`) — not from the browser. The API key is server-only.
- Building context on the client would mean sending the full household snapshot up to the edge function on every keystroke, doubling bandwidth and bypassing RLS via service role for no reason.
- One edge function already builds finance context inline (`ai-finance-chat/index.ts` lines 98–170). We extract and generalize that pattern.

So we put the context builder and system prompts in `supabase/functions/_shared/` and the edge functions decide what `module` to use. The client only sends `{ messages, householdId, module? }`.

If the user prefers a client-side builder anyway, we can flip it — but I'd flag it as the wrong layer.

## What we'll build

### 1. `supabase/functions/_shared/aiContext.ts` (new)
`buildHouseholdContext({ supabase, module, householdId, userId, now })` returns a formatted plain-text block. Modules: `finance | habits | tasks | calendar | meals | general`. Uses service-role client (membership already verified upstream). Per-module fetchers match the spec's data lists; `general` calls all of them capped at 5 items each. Output uses the structured-string format from the spec (₹, DD Mon YYYY, ⚠️/🔴/✓ markers).

### 2. `supabase/functions/_shared/aiSystemPrompts.ts` (new)
Exports `FINANCE_SYSTEM_PROMPT`, `HABITS_SYSTEM_PROMPT`, `TASKS_SYSTEM_PROMPT`, `CALENDAR_SYSTEM_PROMPT`, `MEALS_SYSTEM_PROMPT`, `GENERAL_SYSTEM_PROMPT` with `{CONTEXT}` placeholder. Copy verbatim from the prompt spec but keep the existing "no diminutives / no sweetie" guardrail line that's already in production.

### 3. Update `supabase/functions/ai-finance-chat/index.ts`
Replace the inline 70-line context block with `buildHouseholdContext({ module: 'finance', ... })` + `FINANCE_SYSTEM_PROMPT`. Functional behaviour stays the same; data set expands to match the spec (prev-month comparison, top-5 categories with % used, subscriptions, paid_by member on transactions).

### 4. Update `supabase/functions/ai-chat/index.ts`
This is the **central advisor** backing `/ask-ai` and the home AI sheet. Currently sends only a personality prompt with **no household data**. Accept an optional `module` field (default `'general'`); inject `buildHouseholdContext({ module, ... })` + the matching system prompt. Keep tool-calling (`create_task`, `list_tasks`, etc.) intact.

### 5. Client wiring (minimal — no UI changes)
Add a `module` field to the POST body at each call site so `ai-chat` knows which prompt to use:

| File | module |
|---|---|
| `src/pages/AskAi.tsx` | `'general'` |
| `src/components/ai/AIActionSheet.tsx` (home FAB) | `'general'` |
| `src/components/ai/AIChatWidget.tsx` | `'general'` (or derive from route if easy) |
| `src/pages/FinanceChat.tsx` | already uses `ai-finance-chat`, no change |

No new client-side data fetching, no UI/layout changes.

### 6. Conversation memory
Already correct in `AskAi.tsx` and `AIActionSheet.tsx` — full history is sent. Add a server-side cap in `ai-chat`: keep system prompt + last 20 messages (drop oldest user/assistant pair when over). Context is rebuilt fresh per call (already the case — no caching to remove).

### 7. Loading & error states
- Loading indicator already exists in both `AskAi.tsx` and `AIActionSheet.tsx` ("…thinking" dots). No change.
- If `buildHouseholdContext` throws inside the edge function, catch it, swap in a reduced context string (`"Note: household data could not be loaded …"`), and add `x-context-degraded: true` response header. Client reads the header and shows a one-line "⚠️ Response based on limited data" note below the message.
- AI API failure handling (429 / 402 / generic) is already in place — keep it, but ensure the toast message in `AskAi.tsx` / `AIActionSheet.tsx` offers a Retry that resends the last user message.

## Out of scope
- No UI redesign of chat surfaces.
- No new tables / migrations.
- No change to `ai-finance-chat` request shape (still `{ messages, householdId }`).
- Habit/task/calendar/meal-specific entry points don't currently call an AI endpoint, so wiring those is deferred until those entry points exist; the shared builder is ready for them.

## Technical notes
- All fetches inside `buildHouseholdContext` run in parallel via `Promise.all` per module to keep added latency under ~300ms.
- Indian formatting helper (`₹1,25,000`, `DD MMM YYYY`) added once in `_shared/aiContext.ts`; reuses logic equivalent to `src/lib/formatINR.ts`.
- Member-name lookup: single `profiles` query keyed by `household_members.user_id`, then a `Map` for `paid_by → name` resolution.
- Token guardrail: cap each list at 10 items (5 for `general`), truncate descriptions at 60 chars.

## Acceptance
- "What did we spend most on this month?" → AI cites real top categories with ₹ amounts.
- Central `/ask-ai` "How are we doing overall?" → AI mentions concrete finance, task, and habit numbers.
- Killing the DB mid-call → degraded warning appears under the AI's response, no crash.
- Existing finance chat continues to work; no regressions in tool-calling on `ai-chat`.