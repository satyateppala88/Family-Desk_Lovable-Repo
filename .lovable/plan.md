
## Status of the 6 items

Five of the six are already implemented exactly as requested. No code changes needed:

| # | Item | Where | Status |
|---|------|-------|--------|
| 1 | Wrong-credentials text "Incorrect email or password. Please try again." below Sign In | `src/pages/Auth.tsx:191`, rendered at line 412 | ✅ already present |
| 2 | Empty household name → inline red "Please enter a household name" | `src/pages/HouseholdSetup.tsx:50-52`, rendered at line 220 | ✅ already present |
| 3 | Invalid invite code → "Invalid invite code. Please check with your household admin." | `src/pages/HouseholdSetup.tsx:115`, rendered at line 256 | ✅ already present |
| 5 | Tab switch clears all form fields | `src/pages/Auth.tsx:35-50` (`resetFormFields` runs on `handleTabChange`) | ✅ already present |
| 6 | "Forgot password?" link with success copy "If this email is registered…" | `src/pages/Auth.tsx:245-265` + button at lines 373-380 | ✅ already present |

## #4 — Debug "Join household not completing" (keep admin-approval model)

You confirmed: keep the admin-approval flow. The current code (lines 145-179) inserts a row into `household_invitations` with `status='pending'`, shows a toast, and navigates to `/`. The reasons it *feels* broken:

1. **Silent RLS rejection.** A non-member inserting `household_invitations` row where `invitee_user_id = self` may be blocked by the existing RLS (which is built around admins inviting members, not strangers self-requesting). If insert fails, the toast surfaces a raw error and the user stays on the page.
2. **Confusing redirect.** On success, code redirects to `/`. The user has no `household_id` yet, so route guards bounce them back to `/household-setup` — looking like nothing happened.
3. **No pending state.** After requesting, the Join tab still shows the same "Request to join" button, so re-clicking creates a duplicate request (or errors on unique constraint).

### Fix plan (frontend only, no schema changes)

**a. Verify the request actually persists.** Wrap the insert with explicit error logging and surface a clear inline message instead of a toast when RLS denies. If the existing `household_invitations` RLS does not permit a prospective member to self-insert a `pending` request, switch the call to a small edge function `request-join-household` that runs with the service role, validates the invite code server-side, and inserts the pending row. (Adding this edge function is the only backend change; no DB migration needed.)

**b. Replace the post-success behavior.** Instead of `navigate("/")`, render a "Request sent" success card in place of the Join form:
   - "We've sent your request to join **{household name}**."
   - "You'll get an email when the admin approves. Until then you can sign out or wait."
   - Buttons: "Sign out" and "Check status" (re-queries `household_invitations` for the current user; if `status='accepted'`, redirects to `/onboarding/preferences`).

**c. Block duplicate submissions.** On mount, query `household_invitations` for `invitee_user_id = current user AND status = 'pending'`. If one exists, render the success card directly with the existing household name.

**d. Handle unique-constraint or duplicate errors gracefully.** If the insert fails because a pending request already exists, treat it as success and show the same card.

### Files touched

- `src/pages/HouseholdSetup.tsx` — replace `handleJoinHousehold` flow, add pending-state card and on-mount lookup.
- *Possibly* `supabase/functions/request-join-household/index.ts` — new edge function only if RLS blocks the direct insert. Will confirm with a quick `read_query` against the `household_invitations` policies during implementation; if the existing policy already allows self-insert of pending requests, skip the edge function entirely.

### Out of scope

- No database migration, no schema change, no change to the admin-approval model.
- No changes to items 1, 2, 3, 5, 6 (already shipped).
