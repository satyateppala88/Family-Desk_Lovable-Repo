## Why two emails are arriving

The signup flow runs **two parallel verification systems**:

1. **Supabase's built-in confirmation email** — fired automatically by `supabase.auth.signUp(...)` in `src/pages/Auth.tsx` (line 130) because auto-confirm is disabled. Supabase sends its default templated email containing `{{ .ConfirmationURL }}`.
2. **Our custom branded verification email** — fired immediately after via `sendVerificationEmail(...)` (line 156), which invokes the `send-verification-email` edge function. That function generates a token, stores it in `email_verification_tokens`, and emails a `…/verify-email?token=…` link via Resend.

Both arrive within seconds of each other, each with a different verification link. Whichever the user clicks first wins; the other goes unused (this is also why Pranav's row had `used_at = NULL` while `email_confirmed_at` was set — he clicked Supabase's default link, not ours).

There is **no `auth-email-hook`** deployed, so Supabase's default email is not being intercepted/replaced.

## Recommended fix — keep the custom flow, suppress Supabase's email

The codebase is heavily invested in the custom token flow (`email_verification_tokens` table, `verify-email-token` edge function, Resend template, `/verify-email` route, 24h expiry, resend cooldown). The cleanest fix is to stop Supabase from sending its own email while preserving our branded one.

### Changes

1. **Enable `auto_confirm_email`** at the Supabase auth level. This stops Supabase from sending the default confirmation email on signup. (Supabase will mark `email_confirmed_at` immediately, so we must move the verification gate off of that field — see step 3.)

2. **Add an `email_verified_at` column** to `public.profiles` (nullable timestamptz). The `verify-email-token` edge function will set this to `now()` when our custom token is consumed, making it the single source of truth for "this user proved they own the email."

3. **Update sign-in gate** in `src/pages/Auth.tsx` (line 196) to check `profiles.email_verified_at` instead of `auth.users.email_confirmed_at`. Block sign-in and show the verification-pending screen when it's null.

4. **Backfill existing users** so anyone already verified (i.e. `auth.users.email_confirmed_at IS NOT NULL` today) gets `profiles.email_verified_at` set, so no one is locked out after the change.

5. **No change** to: `send-verification-email`, `verify-email-token` (other than writing the new column), `/verify-email` page, or the resend / cooldown UX.

### Result

- One email per signup — our branded FamilyDesk verification.
- Sign-in still blocks unverified users.
- Existing verified users continue to sign in.
- Pranav-style cases (consumed Supabase's link, ignored ours) disappear because Supabase stops sending its own.

## Alternative (not recommended)

Replace both with Lovable's managed `auth-email-hook` flow: scaffold the auth email templates, deploy the hook, and remove the custom `send-verification-email` + `email_verification_tokens` machinery. This is the "canonical" Lovable path but is a larger refactor and discards the existing token table, expiry logic, resend cooldown, and Resend template wiring you already have working in production. Mention only if you want to consolidate.

## Files / surfaces touched

- `src/pages/Auth.tsx` — change verification gate from `email_confirmed_at` to `profiles.email_verified_at`.
- `supabase/functions/verify-email-token/index.ts` — additionally set `profiles.email_verified_at = now()` when marking token used.
- New migration:
  - `ALTER TABLE public.profiles ADD COLUMN email_verified_at timestamptz;`
  - Backfill from `auth.users.email_confirmed_at`.
- Supabase auth config: `auto_confirm_email = true`.

No UI/visual changes. No change to the welcome email sent by `verify-email-token` after successful verification.