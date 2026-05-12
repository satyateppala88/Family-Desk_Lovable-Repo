## Plan: Refactor `useHousehold` queryFn to a single join

Replace the two sequential queries with one join, as you specified — but with one important tweak to preserve existing behavior.

### Concern with the literal replacement

Your proposed snippet uses `.limit(1).maybeSingle()` with no `ORDER BY`. The current code intentionally orders by `households.created_at DESC` because users who belong to multiple households would otherwise land in an arbitrary one (Postgres returns rows in undefined order without an `ORDER BY`). The existing inline comment calls this out explicitly.

If we drop the ordering, we re-introduce that bug for any user with >1 household membership.

### Proposed queryFn (your structure + preserved ordering)

```ts
queryFn: async () => {
  if (!user) return { householdId: null, onboardingCompleted: false,
                      householdName: null, householdAvatarUrl: null };

  // Single join query instead of two sequential round-trips.
  // Order by household created_at DESC so users in multiple households
  // deterministically land in the most recently created one.
  const { data: memberData, error: memberError } = await (supabase as any)
    .from("household_members")
    .select("household_id, households!inner(onboarding_completed, name, avatar_url, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { foreignTable: "households", ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberError) throw memberError;

  const householdId = memberData?.household_id || null;
  if (!householdId) {
    return { householdId: null, onboardingCompleted: false,
             householdName: null, householdAvatarUrl: null };
  }

  const householdData = memberData?.households;
  return {
    householdId,
    onboardingCompleted: householdData?.onboarding_completed || false,
    householdName: householdData?.name || null,
    householdAvatarUrl: householdData?.avatar_url || null,
  };
},
```

### Changes from current code
- Two queries → one join (your goal).
- `.maybeSingle()` instead of throwing when no row exists (your goal).
- Keeps the `ORDER BY households.created_at DESC` for multi-household correctness.
- Drops the dev-only `console.warn` for multi-household users (it required fetching all rows; not worth a second query).

### Confirm
Want me to apply this version (with ordering preserved), or your literal snippet (no ordering)? Default: apply the version with ordering preserved.
