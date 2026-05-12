## Plan: Rotate Supabase API keys

Since the `.env` file (containing the anon/publishable key) was previously committed to the repository, rotating the keys is the right next step to invalidate the exposed credentials.

### What will happen

I'll use the `rotate_api_keys` tool, which will:
1. Generate fresh API keys for your Lovable Cloud backend
2. Automatically update the `.env` file with the new `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Update the internal Supabase client integration to use the new keys
4. Disable the old/legacy keys so any previously exposed values stop working

### After rotation

- The app will continue to work normally — the Supabase client picks up the new key automatically.
- Any external scripts, third-party tools, or documentation that hardcoded the old anon key will need to be updated with the new value.
- The internal service role key (used only by edge functions) is also rotated; edge functions automatically receive the updated value, no redeploy needed.

### Note

This rotates the **anon (publishable) key** and the **service role key** together — they're rotated as a pair by Supabase. There's no way to rotate just the anon key in isolation.

Confirm and I'll run the rotation.
