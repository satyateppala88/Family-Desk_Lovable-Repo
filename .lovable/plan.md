Plan to fix the missing welcome email after household invite acceptance

What I found
- The app already sends:
  - an invitation email when an admin invites someone
  - a response email to the inviter when the invitee accepts/declines
  - a generic welcome email only during email verification
- The invited-user flow accepts the household invite in `PendingInvitationBanner`, adds the member to the household, then notifies the inviter. It does not send a welcome email to the joining user at that moment.
- There is currently no configured Lovable Email domain in this workspace, while the existing project email code uses the existing Resend-based functions and templates.

Implementation plan
1. Add a household-specific welcome email template
   - Reuse the existing Family Desk email wrapper and brand style.
   - Add copy tailored to an invited user who just joined a household.
   - Include household name, role, and a button to open the dashboard.

2. Add a secure backend email endpoint for the invited user welcome
   - Create a new backend function for “household member welcome”.
   - Require the user’s signed-in token.
   - Validate the request body.
   - Verify the caller is the same invitee and is a member of the target household before sending.
   - Respect the existing household invitation/email preference if the user has opted out.
   - Send to the authenticated user’s email only, not to an arbitrary email supplied by the client.

3. Trigger it after invite acceptance
   - In `PendingInvitationBanner`, after the membership insert and invitation status update succeed, call the new backend email endpoint.
   - Keep the existing inviter notification unchanged.
   - Do not block the household join if the welcome email fails; log a warning and still show “You’ve joined the household!”

4. Improve routing in email links
   - Use the current app origin for the dashboard URL instead of hardcoding only the production domain, so preview/test links behave correctly.

5. Verify
   - Deploy the new/changed backend function.
   - Check function logs after a test invite acceptance.
   - Confirm the invitee receives the new “Welcome to the household” email and the inviter still receives the existing accepted notification.

Technical details
- Files likely to change:
  - `supabase/functions/_shared/email-templates.ts`
  - new `supabase/functions/send-household-member-welcome/index.ts`
  - `src/components/household/PendingInvitationBanner.tsx`
  - possibly `supabase/config.toml` for the new function’s config block, following existing email function patterns.
- This should not require a database schema change.
- Because the current project already uses Resend-backed email functions and has the relevant secret configured, I’ll follow that existing app pattern for this fix rather than introducing a new email infrastructure path mid-flow.