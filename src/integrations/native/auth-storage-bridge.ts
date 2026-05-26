// Auth storage bridge for Capacitor native platforms.
//
// Problem: iOS WKWebView can clear localStorage under memory pressure,
// which wipes the Supabase auth token (`sb-*-auth-token`) and signs the
// user out unexpectedly. Android WebView is less aggressive but can also
// evict storage. Capacitor Preferences uses the iOS Keychain / Android
// SharedPreferences, both of which survive backgrounding and memory
// pressure.
//
// We cannot modify `src/integrations/supabase/client.ts` (auto-generated),
// so instead we:
//   1. On boot (native only): read all `sb-*` keys from Preferences and
//      seed them into localStorage *before* the Supabase client is
//      imported anywhere.
//   2. Patch `localStorage.setItem` / `removeItem` so any subsequent
//      writes to `sb-*` keys are mirrored to Preferences (fire-and-forget).
//      Sign-out clears the token from localStorage, which the mirror
//      then removes from Preferences too — no stale Keychain tokens.
//
// On web this module is a no-op.

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const MIRROR_PREFIXES = ['sb-', 'familydesk_finance_'];

const isMirroredKey = (key: string): boolean =>
  MIRROR_PREFIXES.some(prefix => key.startsWith(prefix));

let installed = false;

export async function rehydrateAuthStorage(): Promise<void> {
  if (installed) return;
  installed = true;

  if (!Capacitor.isNativePlatform()) return;

  // 1. Seed localStorage from Preferences for all sb-* keys.
  try {
    const { keys } = await Preferences.keys();
    await Promise.all(
      keys
        .filter(isMirroredKey)
        .map(async (key) => {
          try {
            const { value } = await Preferences.get({ key });
            if (value !== null) {
              // Use the original setter so we don't trigger the mirror
              // (Preferences already has the up-to-date value).
              originalSetItem.call(localStorage, key, value);
            }
          } catch {
            /* per-key failures are non-fatal */
          }
        }),
    );
  } catch {
    /* Preferences unavailable — fall through to plain localStorage */
  }

  // 2. Patch setItem / removeItem to mirror sb-* writes into Preferences.
  localStorage.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (isMirroredKey(key)) {
      void Preferences.set({ key, value }).catch(() => {
        /* fire-and-forget */
      });
    }
  };

  localStorage.removeItem = function patchedRemoveItem(key: string) {
    originalRemoveItem.call(this, key);
    if (isMirroredKey(key)) {
      void Preferences.remove({ key }).catch(() => {
        /* fire-and-forget */
      });
    }
  };
}

// Capture originals once at module load, before any patching.
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;