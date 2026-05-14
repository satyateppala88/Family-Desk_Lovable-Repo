## Realtime channels + mutation invalidation fallback

### What I found

- `src/hooks/useRealtimeSubscription.ts` already cleans up via `supabase.removeChannel(channel)` and uses a deterministic hash-based name (not `Math.random`), but the name doesn't match the spec format and isn't keyed on the household. Two pages mounting the same configs can still produce the same channel topic in the same Supabase client, and the spec wants `realtime-${householdId}-${tables.sort().join('-')}`.
- The household-wide subscription in `src/components/realtime/HouseholdRealtimeProvider.tsx` already follows the pattern (one channel per household, deterministic name `household-${householdId}`, cleanup, correct deps). No changes needed there.
- Most mutation hooks already call `queryClient.invalidateQueries` in `onSuccess`. **Two have zero invalidations**: `src/hooks/useUserCards.ts` and `src/hooks/useSubscriptions.ts`. A few others have 1 fewer invalidate than mutations (`useNotificationPreferences`, `useHouseholdPreferences`, `useRegenerateMeals`, `useMealPlans`, `useTasks`, `useProjects`, `useRecipes`, `usePantryCategories`, `useCustomCards`) — most of these are mutations that intentionally don't need cache writes (e.g. logging, side-effects), but I'll spot-check.

### Changes

#### 1. `src/hooks/useRealtimeSubscription.ts`

- Add an optional `householdId` parameter so the hook can build the spec channel name. Signature becomes `useRealtimeSubscription(configs, householdId?)`. Existing call sites that don't pass it fall back to `"shared"`.
- Compute `channelName = realtime-${householdId ?? "shared"}-${activeTables.sort().join("-")}`.
- Keep cleanup via `supabase.removeChannel(channel)`.
- Effect deps: `[householdId, channelName, queryClient]` (channelName is the new stable signature; the per-config queryKeys are captured by closure but won't change identity meaningfully because we already key by table list).
- Update the 11 call sites to pass `householdId` where it's available locally (every caller already has it from `useHousehold`).

#### 2. Add fallback `invalidateQueries` to the two hooks that lack it

- **`src/hooks/useUserCards.ts`** — for each of `addUserCard`, `updateUserCard`, `deleteUserCard`, add `onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-cards", householdId] })` (use whatever query key the file's read query already uses; verify before editing).
- **`src/hooks/useSubscriptions.ts`** — for each of its 4 mutations, add `onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance-subscriptions", householdId] })` (verify the existing query key in the file).

#### 3. Spot-check one-short hooks

For each of `useNotificationPreferences`, `useHouseholdPreferences`, `useRegenerateMeals`, `useMealPlans`, `useTasks`, `useProjects`, `useRecipes`, `usePantryCategories`, `useCustomCards`: read the file, identify any mutation whose `onSuccess` lacks `invalidateQueries`, and add one targeted invalidate against that hook's primary query key. Skip mutations that are pure side-effects (auth, RPCs that return nothing cached). I'll only edit the ones with a real gap.

### Out of scope per spec

- No table or RLS changes.
- No changes to `HouseholdRealtimeProvider` (already conformant).
- No new realtime subscriptions; only the hook contract and missing fallbacks.

### Verification

1. Open two tabs as the same user → mutate in tab A → tab B's UI updates without reload.
2. Mount any page that uses `useRealtimeSubscription` → channel topic in dev console reads `realtime-<householdId>-<tables>`.
3. Add a card via `useUserCards.addUserCard` → list updates instantly without reload.
4. Add a subscription via `useSubscriptions` → finance subscriptions list updates instantly.