## Three invitation-flow fixes

### Fix 1 — "Invite Member" button on /settings does nothing
`InviteMemberDialog` wraps the trigger in `<span onClick={() => setOpen(true)} className="contents">`. On the Settings page this click sometimes never opens the sheet (most likely the `display:contents` span is being skipped for click handling on certain mobile WebViews / inside the Card layout, or another ancestor is intercepting). Either way the wrapper pattern is fragile.

- Edit `src/components/household/InviteMemberDialog.tsx`: replace the `<span ...>{trigger}</span>` wrapper with `React.cloneElement(trigger, { onClick: () => setOpen(true) })`. Falls back to the existing default `<Button>` when no trigger is supplied. This guarantees the click handler lives on the actual trigger element.
- No call-site change needed; Settings, Members and Invitations pages keep passing a `<Button>` trigger.

### Fix 2 — Household name shows blank in the invitation banner
RLS on `households` only lets a user `SELECT` rows where they're already a member. The banner does `households:household_id (name)` for invitations addressed to the user before they're a member, so the join silently returns `null` and the banner shows `""`.

- **Migration:** add `household_name text` column to `public.household_invitations`. Backfill from `households.name`. Add a trigger that auto-populates `household_name` on insert/update when a row references a household, so the column stays in sync without depending on the client.
- **Client `InviteMemberDialog.tsx`:** include `household_name: householdName` in the `insert` payload (use the value already fetched from `households` a few lines below), as a belt-and-braces alongside the trigger.
- **`PendingInvitationBanner.tsx`:** select `household_name` from `household_invitations` directly (drop reliance on the joined `households.name`); render `You've been invited to join "{invitation.household_name || 'a household'}"`. Also use `invitation.household_name` in the welcome / response edge-function payloads in place of `invitation.households?.name`.
- No edge-function code change required for this bug — invitations are inserted client-side; `send-household-invitation` only sends the email and already receives `householdName` in the body.

### Fix 3 — Accept invitation doesn't switch active household
The accept mutation already inserts into `household_members` and updates the invitation, but `useHousehold` picks the first member row with no deterministic ordering, so after `window.location.reload()` the user often lands back in their original household. There is no "active household" column on `profiles`, so the practical fix is to make ordering deterministic (newest membership wins) and add stronger client refresh.

- **`src/hooks/useHousehold.ts`:** add `.order("joined_at", { ascending: false })` to the `household_members` query before `.limit(1).maybeSingle()`. This makes the just-accepted household the active one.
- **`PendingInvitationBanner.tsx` accept mutation:**
  - Keep the existing `household_members` insert and `household_invitations` update (also rename `status` from `"approved"` to `"accepted"` to match the spec wording — both values currently round-trip but `"accepted"` is the documented one; verified other code paths use plain `.eq("status", "pending")` filters and don't look at the accepted/approved string).
  - On success, before the reload, call `queryClient.invalidateQueries()` with no key (broad invalidate of every household-scoped query), then `navigate("/dashboard")` and `window.location.reload()` so the new household context fully loads. Keep the existing `["my-pending-invitations"]` and `["household"]` invalidations as a safety net for the brief moment before reload.
- No schema change needed for "active household" — ordering by `joined_at DESC` plus the broad invalidate gives the user the new household immediately, matching the requested behavior. (If a future requirement is "let user explicitly switch between households", that needs a separate `profiles.active_household_id` design — out of scope here.)

### Migration summary
Single migration that:
1. `ALTER TABLE public.household_invitations ADD COLUMN IF NOT EXISTS household_name text;`
2. Backfill: `UPDATE public.household_invitations hi SET household_name = h.name FROM public.households h WHERE hi.household_id = h.id AND hi.household_name IS NULL;`
3. Trigger function `set_household_invitation_name()` (SECURITY DEFINER, `search_path = public`) that on `BEFORE INSERT OR UPDATE OF household_id` fills `NEW.household_name` from `households.name` if NULL or stale.
4. `CREATE TRIGGER trg_set_household_invitation_name BEFORE INSERT OR UPDATE ON public.household_invitations FOR EACH ROW EXECUTE FUNCTION public.set_household_invitation_name();`

### Verification
1. /settings → tap "Invite Member" → bottom sheet opens (FIX 1).
2. Send an invitation to a second test account → log in as that account → banner reads `You've been invited to join "<actual household name>"` (FIX 2).
3. Tap Accept → toast appears, page reloads, dashboard now shows the new household's data; `useHousehold` returns the new `householdId` and name (FIX 3).
4. Backfilled existing pending invitations also display the correct name.