## Goal

Replace the always-visible AI sparkle FAB with **contextual** AI actions inside Tasks, Finance, and Grocery, each opening a shared lightweight bottom sheet that talks to the existing `ai-chat` edge function.

## Part 1 — Remove the global AI FAB

In `src/components/ai/AIChatWidget.tsx`:
- Remove the floating trigger button + tooltip (the `<TooltipProvider>` block rendering the sparkle FAB).
- Keep the `familydesk:open-ai` window event listener and the Drawer/Sheet so any existing callers (dashboard quick action) still work.
- All chat/streaming logic is preserved unchanged.

No changes to `App.tsx` mount — widget stays mounted but renders nothing unless opened via the event.

## Part 2 — New shared component: `AIActionSheet`

New file `src/components/ai/AIActionSheet.tsx`. Built on the existing `BottomSheet` primitive.

Props:
```ts
{ isOpen, onClose, initialPrompt: string }
```

Behavior:
- On open, auto-fires `initialPrompt` to `${VITE_SUPABASE_URL}/functions/v1/ai-chat` using the same streaming pattern as `AIChatWidget` (JWT from `supabase.auth.getSession()`, body `{ messages, householdId, userId }`).
- Maintains its own local `messages[]` (independent of the global chat session).
- Header: ✨ icon + "FamilyDesk AI" title, close × (provided by `BottomSheet`).
- Drag handle is already rendered by `BottomSheet`.
- Body: scrollable, max-height 60vh, shows assistant messages with markdown-friendly `whitespace-pre-wrap`.
- Loading: 3 pulsing dots (reuse the bouncing-dot pattern already in `AIChatWidget`).
- Footer: "Ask a follow-up…" `Input` + send button — sends into the same local thread (same `householdId`/`userId` context).

Does **not** open the global chat panel.

## Part 3 — Wire entry points

### Tasks (`src/pages/Tasks.tsx`)
Add an outlined `Button` with `Sparkles` icon + label "Prioritise my list" right-aligned in the page header actions row. Click → open `AIActionSheet` with prompt:
> "Prioritise my current task list by urgency and due date and suggest what I should focus on today."

### Finance (`src/pages/Finance.tsx`)
Same pattern in the Finance hub header. Label "Analyse this month". Prompt:
> "Analyse my household's spending for this month. Highlight the top 3 categories, any unusual spikes, and one actionable suggestion to reduce spend."

### Grocery (`src/pages/Grocery.tsx`)
Inside the Pantry tab, **below the pantry list** (after the category sections / `LowStockAlert` block, before `FloatingCartButton`), render a full-width outlined `Button` with sparkle icon: "What am I running low on?". Prompt:
> "Based on my current pantry inventory, what staples are running low and what should I add to my shopping list this week?"

## Out of scope (explicit)

- Meals "Suggest dinner" — untouched.
- Habits AI Coach — untouched.
- Edge function, prompts, auth, household scoping — untouched.
- Dashboard quick action that dispatches `familydesk:open-ai` — still works (global widget remains mounted, just FAB-less).

## Files touched

- `src/components/ai/AIChatWidget.tsx` — remove FAB JSX only.
- `src/components/ai/AIActionSheet.tsx` — **new**, shared bottom sheet.
- `src/pages/Tasks.tsx` — header button + sheet state.
- `src/pages/Finance.tsx` — header button + sheet state.
- `src/pages/Grocery.tsx` — pantry-tab full-width button + sheet state.
