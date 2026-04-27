#!/usr/bin/env bash
# Fails CI if any client-side source file references VAPID material.
#
# The VAPID private key (and the JWT subject) must only be read inside
# Supabase edge functions via Deno.env.get(). Anything in `src/` that mentions
# these names is almost certainly a mistake that would ship the secret in the
# browser bundle.
set -euo pipefail

# Match real code references: env-var lookups, not narrative comments.
# Allows: bare identifier in code (Deno.env.get / process.env / import.meta.env)
# Blocks anything that looks like an actual access pattern in src/.
PATTERN='env(\.|\[["'\'']| *\. *get *\( *["'\''])(VAPID_PRIVATE_KEY|VAPID_SUBJECT|VITE_VAPID)|VITE_VAPID[A-Z_]*\s*='

if grep -RInE "$PATTERN" src/ 2>/dev/null; then
  echo ""
  echo "❌  Found a forbidden VAPID reference in src/."
  echo "    The private key and subject must live in Supabase secrets and be"
  echo "    read only from supabase/functions/**. The client only needs the"
  echo "    public key, fetched at runtime from the push-subscribe function."
  exit 1
fi

echo "✓ No client-side VAPID references found."