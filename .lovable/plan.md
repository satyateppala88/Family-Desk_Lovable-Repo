# Finance AI Chat markdown + audit of reported issues

After exploring the codebase, three of the four reported issues are **already fixed** in the current code. Only the markdown rendering in the Finance AI chat actually needs a code change.

## What I verified

### 1. Account Settings link — already correct
- `src/components/layout/Header.tsx` (line 207) navigates to `/account-settings`.
- `src/App.tsx` (line 138) defines `/account-settings` → `AccountSettings` page.
- No reference to `/settings/account` exists anywhere in the project.
- **No change needed.**

### 2. Finance "AI Advisor" card — already correct
- `src/pages/Finance.tsx` (line 72) routes the AI Advisor card to `/finance/chat`.
- `src/App.tsx` (line 215) maps `/finance/chat` → `FinanceChat`.
- No reference to `/finance/ai-advisor` exists.
- **No change needed.**

### 3. Display names ("Unknown") — already wired
- `src/hooks/useHouseholdMembers.ts` and `src/hooks/useHabitLeaderboard.ts` both join `profiles` and use `display_name`, falling back to `"Member"` only when the profile is missing/empty (set in the previous task).
- `src/components/taskmaster/TaskCompletionSheet.tsx` ("Assigned to" chips) renders `m.displayName` from that hook.
- DB check confirms all current profiles have `display_name` populated, and RLS allows co-members to read each other's profiles.
- No raw `user_id` or literal `"Unknown"` strings remain in the assignee/leaderboard UI.
- **No change needed.**

If the user is still seeing "Member" anywhere, that means a specific profile row has a null/empty `display_name` — that's a data issue, not a wiring issue. Happy to add a deeper fallback (e.g. derive initials from email) on request.

## What actually needs changing

### 4. Markdown not rendering in `/finance/chat`
- `src/pages/FinanceChat.tsx` (line 174) renders the assistant message as plain text:
  `<p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>`
- `react-markdown` is **not** in `package.json`, so it must be installed.

**Implementation:**
1. `bun add react-markdown remark-gfm`
2. In `src/pages/FinanceChat.tsx`:
   - Import `ReactMarkdown` and `remarkGfm`.
   - For `msg.role === "assistant"`, replace the `<p>` with:
     ```tsx
     <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2">
       <ReactMarkdown remarkGfm={[remarkGfm]}>{msg.content}</ReactMarkdown>
     </div>
     ```
   - Keep the user message branch as the existing plain `<p>` (users type plain text).
3. Tailwind typography: the project's `prose` classes already work via shadcn defaults; if any style looks off, scope with the brand-token classes already used elsewhere (no new tokens introduced).

## Verification
- Open `/finance/chat`, ask a question that returns a list/bold response, confirm bold/italic/lists/headings render rather than showing raw `**` and `*`.
- Confirm streaming still updates progressively (ReactMarkdown re-renders on each `setMessages`).
- Confirm the user bubble still shows plain text.

No DB, edge function, or routing changes.
