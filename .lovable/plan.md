## Findings

All six issues live in two files: `src/pages/Auth.tsx` and `src/pages/HouseholdSetup.tsx`. No DB or edge-function changes needed.

### Important caveat on Issue 4 — "Join household not completing"

The current "Join Existing" flow is **intentional, not a bug**. Per the project memory rule "Invitation System — Proactive admin-invite model, pending banners", the household admin must approve any new member. So the flow is two-step on purpose:

1. **Verify** — only checks the invite code is valid and shows a green "Household Found" card.
2. **Send Join Request** — the button **inside** that green card actually submits a row to `household_invitations` (status: `pending`) and navigates to `/`. The admin then approves from their notifications.

Auto-joining the user (inserting straight into `household_members` and bypassing admin approval) would violate the documented model and existing RLS-protected admin workflow. I will **not** auto-join — instead I'll fix the real UX problem the user is hitting: the second-step CTA isn't obviously the next action, so users think "Verify turning green" was the end of the flow.

## Changes

### `src/pages/Auth.tsx`

1. **(Issue 1) Wrong-credentials inline error** — add `const [signInError, setSignInError] = useState<string | null>(null);`. In `handleSignIn`, on any caught error set `setSignInError("Incorrect email or password. Please try again.")` (still keep the toast for non-auth failures). Clear it whenever the email/password fields change. Render `{signInError && <p className="text-sm text-destructive" role="alert">{signInError}</p>}` directly under the Sign In button.
2. **(Issue 5) Clear fields on tab switch** — convert the Tabs from `defaultValue` (uncontrolled) to `value` + `onValueChange`, with state `const [tab, setTab] = useState<"signin"|"signup">(defaultTab)`. In `onValueChange` reset `email`, `password`, `displayName`, `signInError`, `forgotMessage`, `termsAccepted`, `showPassword`.
3. **(Issue 6) Forgot password link + handler** — under the password field on the Sign In tab, add a right-aligned `<button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>`. On click:
   - If `email` is empty/invalid, set `setSignInError("Enter your email above first, then tap Forgot password.")` and return.
   - Otherwise call `await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: \`${window.location.origin}/reset-password\` })`.
   - Always (even on error) show a neutral success line below the button: `setForgotMessage("If this email is registered, you'll receive a reset link shortly.")` — never reveal whether the address exists. Track `const [forgotMessage, setForgotMessage] = useState<string | null>(null);`.
   - The `/reset-password` page already exists in routing; no additional page work needed.

### `src/pages/HouseholdSetup.tsx`

4. **(Issue 2) Empty household-name validation** — add `const [createError, setCreateError] = useState<string | null>(null);`. At the top of `handleCreateHousehold`:
   ```ts
   const trimmed = householdName.trim();
   if (!trimmed) { setCreateError("Please enter a household name"); return; }
   setCreateError(null);
   ```
   Pass `householdName: trimmed` to the edge function. Render the error inline below the input (`text-sm text-destructive`). Clear `createError` in the input's `onChange`. Also drop the bare `required` HTML attribute fallback (we now own validation).
5. **(Issue 3) Invalid invite-code inline error** — add `const [verifyError, setVerifyError] = useState<string | null>(null);`. In `handleVerifyCode`, on the no-match / error path set `setVerifyError("Invalid invite code. Please check with your household admin.")` instead of the destructive toast (keep toast only for unexpected catch-block errors). Clear in the input `onChange`. Render under the input row.
6. **(Issue 4) Make "Send Join Request" the obvious next step** (UX-only fix, preserves admin-approval model):
   - Update the green card heading copy from "Household Found" to "Household found — request to join", and the body line to: "We'll send a request to the household admin. You'll get an email when they approve."
   - Auto-focus the "Send Join Request" button when `verifiedHousehold` becomes set (via a `ref` + `useEffect`) so keyboard users land on it; on mobile the `verifiedHousehold` block already appears immediately under the input.
   - Make the button label slightly stronger: "Request to join {name}" (so it's clear what action is happening), keep the `Sending Request…` loading state.
   - Leave the actual mutation untouched (still `household_invitations` insert + navigate to `/`). Document in plan reply that direct-join is intentionally **not** added to preserve the admin-invite security model.

## Verification

- Manual run with the test account `testuser@dealcompass.test`:
  1. Sign in with wrong password → red inline error appears under Sign In button; clears on typing.
  2. Switch tabs → email/password fields become empty; switch back → still empty.
  3. Sign In → click "Forgot password?" with empty email → inline guidance; with email → neutral success line; check spam.
  4. New account → on Household Setup, click Create with empty name → red inline error, no API call; with whitespace only → same; with a real name → succeeds.
  5. Join Existing → enter `000000` → red inline error under input; enter a valid code → green "Household found — request to join" card with focused CTA → click → "Request sent!" toast and redirect to `/`.
- `bunx vitest run src/pages/Auth.test.tsx` to ensure existing auth tests still pass; update them only if they break on the new controlled-tab state.