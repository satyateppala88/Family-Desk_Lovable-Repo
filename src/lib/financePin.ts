import { supabase } from "@/integrations/supabase/client";

const UNLOCK_KEY = "finance_unlocked_at";
const CACHE_KEY = "familydesk_finance_pin_v2"; // { uid, salt, hash }
const LEGACY_HASH_KEY = "familydesk_finance_pin_hash";
const LEGACY_SALT_KEY = "familydesk_pin_salt";
const HASH_PREFIX = "pbkdf2$";

type PinCache = { uid: string; salt: string; hash: string };

const readCache = (): PinCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinCache;
    if (!parsed?.uid || !parsed?.salt || !parsed?.hash) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (c: PinCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
};

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
};

const clearLegacy = () => {
  try {
    localStorage.removeItem(LEGACY_HASH_KEY);
    localStorage.removeItem(LEGACY_SALT_KEY);
  } catch {
    /* ignore */
  }
};

const randomSalt = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const getUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
};

/** PBKDF2-SHA256 hash with an explicit salt. */
export const hashPinWith = async (pin: string, salt: string): Promise<string> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return HASH_PREFIX + hex;
};

/** Legacy: device-salted PBKDF2 used before account-scoped sync. */
const legacyDeviceHash = async (pin: string): Promise<string | null> => {
  try {
    const salt = localStorage.getItem(LEGACY_SALT_KEY);
    if (!salt) return null;
    return await hashPinWith(pin, salt);
  } catch {
    return null;
  }
};

/** Legacy: oldest unsalted SHA-256 digest. */
const legacySha256Hex = async (pin: string): Promise<string> => {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(pin));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Fetch the server-side PIN record for the current user. */
const fetchPinRecord = async (): Promise<{ salt: string; hash: string } | null> => {
  const uid = await getUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("user_finance_pin")
    .select("pin_salt, pin_hash")
    .eq("user_id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return { salt: data.pin_salt, hash: data.pin_hash };
};

/**
 * Bootstrap from server on sign-in. Pulls the authoritative PIN record into
 * the local cache, and migrates any legacy device-only PIN to the server when
 * no server record yet exists.
 */
export const syncFinancePinFromServer = async (): Promise<void> => {
  const uid = await getUserId();
  if (!uid) return;

  // Drop cache if it belongs to a different account.
  const cached = readCache();
  if (cached && cached.uid !== uid) clearCache();

  const server = await fetchPinRecord();
  if (server) {
    writeCache({ uid, salt: server.salt, hash: server.hash });
    clearLegacy();
    return;
  }

  // No server record — migrate a legacy device PIN if present.
  const legacyHash = (() => {
    try { return localStorage.getItem(LEGACY_HASH_KEY); } catch { return null; }
  })();
  const legacySalt = (() => {
    try { return localStorage.getItem(LEGACY_SALT_KEY); } catch { return null; }
  })();
  if (legacyHash && legacySalt && legacyHash.startsWith(HASH_PREFIX)) {
    const { error } = await supabase
      .from("user_finance_pin")
      .upsert({ user_id: uid, pin_salt: legacySalt, pin_hash: legacyHash }, { onConflict: "user_id" });
    if (!error) {
      writeCache({ uid, salt: legacySalt, hash: legacyHash });
      clearLegacy();
    }
  }
};

export const isLegacyPinHash = (): boolean => {
  // Only unsalted-SHA256 legacy hashes need a re-save prompt; PBKDF2 legacy is
  // migrated transparently in syncFinancePinFromServer / verifyPin.
  try {
    const stored = localStorage.getItem(LEGACY_HASH_KEY);
    return !!stored && !stored.startsWith(HASH_PREFIX) && !readCache();
  } catch {
    return false;
  }
};

/** Synchronous check reflecting the cache (after a sign-in sync). */
export const isPinEnabled = (): boolean => {
  if (readCache()) return true;
  try {
    return !!localStorage.getItem(LEGACY_HASH_KEY);
  } catch {
    return false;
  }
};

/** Set or change the PIN for the current account (server is source of truth). */
export const setPin = async (pin: string): Promise<void> => {
  const uid = await getUserId();
  if (!uid) throw new Error("Not signed in");
  const salt = randomSalt();
  const hash = await hashPinWith(pin, salt);
  const { error } = await supabase
    .from("user_finance_pin")
    .upsert({ user_id: uid, pin_salt: salt, pin_hash: hash }, { onConflict: "user_id" });
  if (error) throw error;
  writeCache({ uid, salt, hash });
  clearLegacy();
  try {
    window.dispatchEvent(new CustomEvent("familydesk:finance-pin-changed"));
  } catch { /* ignore */ }
};

/** Verify a PIN against the server-of-truth, with a local cache for speed. */
export const verifyPin = async (pin: string): Promise<boolean> => {
  const uid = await getUserId();

  // Try cache first when it matches the current account.
  const cached = readCache();
  if (uid && cached && cached.uid === uid) {
    const candidate = await hashPinWith(pin, cached.salt);
    if (candidate === cached.hash) return true;
    // Cache might be stale (PIN was changed on another device). Refetch.
  }

  if (uid) {
    const server = await fetchPinRecord();
    if (server) {
      writeCache({ uid, salt: server.salt, hash: server.hash });
      clearLegacy();
      const candidate = await hashPinWith(pin, server.salt);
      return candidate === server.hash;
    }
  }

  // No server record — fall back to legacy device hashes.
  let legacyHash: string | null = null;
  try { legacyHash = localStorage.getItem(LEGACY_HASH_KEY); } catch { /* ignore */ }
  if (!legacyHash) return false;

  if (legacyHash.startsWith(HASH_PREFIX)) {
    const candidate = await legacyDeviceHash(pin);
    if (candidate && candidate === legacyHash) {
      // Migrate to server if signed in.
      if (uid) {
        try { await setPin(pin); } catch { /* keep legacy on failure */ }
      }
      return true;
    }
    return false;
  }

  // Oldest unsalted SHA-256 legacy.
  const sha = await legacySha256Hex(pin);
  if (sha !== legacyHash) return false;
  if (uid) {
    try { await setPin(pin); } catch { /* ignore */ }
  }
  return true;
};

/** Disable PIN for this account (clears server + cache). */
export const clearPin = async (): Promise<void> => {
  const uid = await getUserId();
  if (uid) {
    await supabase.from("user_finance_pin").delete().eq("user_id", uid);
  }
  clearCache();
  clearLegacy();
  clearUnlock();
  try {
    window.dispatchEvent(new CustomEvent("familydesk:finance-pin-changed"));
  } catch { /* ignore */ }
};

export const markUnlocked = () => {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

export const clearUnlock = () => {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
};

export const getUnlockedAt = (): number | null => {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

/** Idle timeout in minutes (or "never"). Stored in localStorage. */
const IDLE_KEY = "familydesk_idle_timeout";
export type IdleTimeout = 1 | 2 | 5 | 10 | "never";

export const getIdleTimeout = (): IdleTimeout => {
  try {
    const raw = localStorage.getItem(IDLE_KEY);
    if (raw === "never") return "never";
    const n = Number(raw);
    if ([1, 2, 5, 10].includes(n)) return n as IdleTimeout;
    return 5;
  } catch {
    return 5;
  }
};

export const setIdleTimeout = (value: IdleTimeout) => {
  try {
    localStorage.setItem(IDLE_KEY, String(value));
    window.dispatchEvent(new CustomEvent("familydesk:idle-timeout-changed"));
  } catch {
    /* ignore */
  }
};

export const getIdleTimeoutMs = (): number | null => {
  const t = getIdleTimeout();
  if (t === "never") return null;
  return t * 60 * 1000;
};

export const isUnlocked = (): boolean => {
  if (!isPinEnabled()) return true;
  const at = getUnlockedAt();
  if (!at) return false;
  const ms = getIdleTimeoutMs();
  if (ms === null) return true; // never auto-locks
  return Date.now() - at < ms;
};