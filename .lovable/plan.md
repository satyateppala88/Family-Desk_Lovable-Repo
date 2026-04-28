## What's actually happening

I checked the database for your household (`854163c0…`):

- **`household_members`**: only 1 row → you (Satya, admin). There is **no extra "unknown" member** in the database.
- **`household_invitations`**: 1 pending row for `rajashreeudupi@gmail.com`, with `invitee_user_id = NULL` and `status = pending`.
- **`auth.users`**: Rajashree did sign up — but with a **different email**: `rajashreeudupi88@gmail.com`. Her account is `a59514a3-…`.

So two things went wrong:

1. **The invite is orphaned.** Our acceptance flow (`PendingInvitationBanner`) matches a signed-in user to invitations by exact email (`invitee_email = auth.jwt() email`). Because Rajashree signed up with `…udupi88@gmail.com` instead of `…udupi@gmail.com`, she never sees the banner, can never accept it, and the invite stays "pending" forever.
2. **The "Unknown user with invalid joining date"** you're seeing on the Members screen is most likely a stale UI render — the database has only you in `household_members`. It can also appear momentarily if a row with a NULL `user_id` or NULL `joined_at` ever sneaks in (the current code renders `"Unknown User"` when `profiles.display_name` is missing and `Invalid Date` when `joined_at` is null).

I want your confirmation before changing anything destructive in the database.

## Proposed fix (two parts)

### 1. Clean up this specific case (data fix)

- **Delete** the orphaned pending invitation for `rajashreeudupi@gmail.com` in your household.
- **Send a fresh invitation** to her actual email `rajashreeudupi88@gmail.com` — she'll then see the "Pending Invitation" banner the moment she logs in and can accept in one tap.
- **(Optional, recommended)** If the Members screen still shows a stale "unknown" row after a hard refresh, that means there's a phantom row I should also delete. We'll verify by reloading first.

### 2. Prevent this from happening again (product fix)

Three small, focused improvements:

**a. Make invitation matching email-case-insensitive and trimmed**
Today the RLS policy compares emails as-is. Switch to `lower(trim(...))` on both sides so `Rajashree@Gmail.com` and `rajashree@gmail.com` are treated the same. Apply the same normalization in `InviteMemberDialog` when creating an invite.

**b. Show admins a clear status when an invitee signs up with a different email**
On the Manage Invitations page, surface a small note like:
> "Awaiting response. If they signed up with a different email, cancel this invite and re-send to the new address."

**c. Harden the Members screen against phantom rows**
- Filter out any row where `user_id IS NULL` from `household_members` queries.
- Show "Member" + "Joined recently" instead of "Unknown User" / "Invalid Date" so a transient render never looks broken.
- Add a unique constraint `UNIQUE (household_id, user_id)` on `household_members` so the same user can never be inserted twice into a household by accident.

**d. (Optional bonus)** Add a "Resend to a different email" button on each pending invite — one click cancels the old invite and reopens the dialog with the email field prefilled.

## Files I'll touch

- `supabase/migrations/<new>.sql` — add `UNIQUE (household_id, user_id)` constraint; update the invitee email RLS policy to use `lower(trim(...))`.
- `src/components/household/InviteMemberDialog.tsx` — normalize email on insert; lowercase + trim before save.
- `src/components/household/PendingInvitationBanner.tsx` — match using `lower(trim())` on the user's email when filtering.
- `src/pages/HouseholdMembers.tsx` — filter out NULL `user_id` rows; replace "Unknown User"/"Invalid Date" with friendlier fallbacks.
- `src/pages/HouseholdInvitations.tsx` — add the "different email" hint and (optionally) the "Resend to different email" action.

## Data clean-up I'll run after you approve

```sql
-- Remove the orphaned invite
DELETE FROM public.household_invitations
WHERE id = '39a71d12-42a9-42b5-8b78-77a93d3fe368';
```

You'll then re-invite Rajashree to `rajashreeudupi88@gmail.com` from the UI.

## What I need from you

1. Confirm I should **delete the pending invite to `rajashreeudupi@gmail.com`** and that you'll re-invite her at `rajashreeudupi88@gmail.com`.
2. Confirm you want the four product hardening changes (a–c required, d optional).
