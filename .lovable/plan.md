## Goal

Keep sending the branded FamilyDesk verification email on sign-up everywhere, but stop blocking sign-in on `profiles.email_verified_at` in the test/preview environment. Production (`familydesk.in` / `www.familydesk.in`) keeps the gate.

## Why a host-based check (not an env var)

Lovable publishes the same source from Test → Live, so `import.meta.env.MODE` is `production` in both. The only reliable runtime signal that distinguishes the two is the hostname. Production runs on `familydesk.in` / `www.familydesk.in`; everything else (`*.lovable.app`, `*.lovable.dev`, `localhost`) is treated as test.

## Changes

### 1. `src/lib/env.ts` (new, tiny helper)

Export `isProductionHost()` returning `true` only when `window.location.hostname` is `familydesk.in` or `www.familydesk.in`. SSR-safe (returns `false` if `window` undefined).

### 2. `src/pages/Auth.tsx` — `handleSignIn` (around lines 195–218)

Wrap the `email_verified_at` block so it only runs when `isProductionHost()` is true. In test env, sign-in proceeds straight to the household / dashboard logic regardless of verification state.

```ts
if (data.user && isProductionHost()) {
  // existing email_verified_at lookup + verification-pending screen
}
```

No other code paths change. The branded verification email continues to be sent from `handleSignUp` exactly as today, and `verify-email-token` still stamps `profiles.email_verified_at` when the link is clicked — so users who do verify in test env still get the same DB state as production users.

## Out of scope

- No DB migration.
- No change to `send-verification-email` or `verify-email-token`.
- No change to Supabase auth settings (auto-confirm stays on so Supabase doesn't send its own email).
- No change to `AuthContext` (it already only looks at `email_confirmed_at`, which is auto-set).

## Result

- Test env (`*.lovable.app`, preview, localhost): branded verification email still arrives, but unverified users can sign in and use the app.
- Production (`familydesk.in`): unchanged — verification still required to sign in.
