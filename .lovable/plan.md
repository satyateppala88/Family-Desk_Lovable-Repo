I checked the app logs, backend linter, recent migration files, and the Live database state. The frontend preview server shows no build error. The likely publish failure is a Live database migration failure, because one unpublished migration adds a unique constraint to `household_preferences.household_id`, and Live currently has 3 rows for the same household. That constraint cannot be added until the duplicate Live rows are cleaned up.

Plan to fix:

1. Make the pending Live migration safe and idempotent
   - Update the unpublished `household_preferences` migration so it deduplicates Live rows deterministically before adding the unique constraint.
   - Keep the newest row for each household, as the current migration intended.
   - Add guards around the constraint creation so re-running/publishing does not fail if the constraint already exists.

2. Harden the other recent migrations against repeat/publish edge cases
   - Ensure the household members unique constraint migration is idempotent.
   - Keep the invitation cleanup and RLS policy updates safe to re-run.
   - Keep the security hardening changes, but avoid statements that could fail if a function/signature/policy has already changed between Test and Live.

3. Re-check Live preconditions
   - Verify no remaining duplicate rows block the unique constraints.
   - Confirm the specific pending invitation cleanup target still exists only if it is safe to delete.

4. Validate after changes
   - Run a production build check after edits.
   - Re-run the backend security linter and confirm there are no critical findings.
   - If possible, test the relevant database migration path against the current schema assumptions before you publish again.

Expected outcome:
- Publish should no longer fail on the Live schema sync.
- The duplicate `household_preferences` rows in Live will be reduced to one per household during publish.
- The earlier security hardening remains in place.