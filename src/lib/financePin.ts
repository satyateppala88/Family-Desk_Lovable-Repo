const PIN_HASH_KEY = "familydesk_finance_pin_hash";
const UNLOCK_KEY = "finance_unlocked_at";
const SALT_KEY = "familydesk_pin_salt";
const HASH_PREFIX = "pbkdf2$";

// Get or create a device-specific salt (stored separately from the hash)
const getOrCreateSalt = (): string => {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
};

export const hashPin = async (pin: string): Promise<string> => {
  const salt = getOrCreateSalt();
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

/** True when a stored hash exists but uses the old unsalted SHA-256 format. */
export const isLegacyPinHash = (): boolean => {
  const stored = getStoredHash();
  return !!stored && !stored.startsWith(HASH_PREFIX);
};

export const getStoredHash = (): string | null => {
  try {
    return localStorage.getItem(PIN_HASH_KEY);
  } catch {
    return null;
  }
};

export const setStoredHash = (hash: string) => {
  try {
    localStorage.setItem(PIN_HASH_KEY, hash);
  } catch {
    /* ignore */
  }
};

export const clearStoredHash = () => {
  try {
    localStorage.removeItem(PIN_HASH_KEY);
  } catch {
    /* ignore */
  }
  clearUnlock();
};

export const isPinEnabled = (): boolean => !!getStoredHash();

export const verifyPin = async (pin: string): Promise<boolean> => {
  const stored = getStoredHash();
  if (!stored) return false;
  // Legacy unsalted SHA-256 hashes can no longer be verified — force a re-set.
  if (!stored.startsWith(HASH_PREFIX)) return false;
  const candidate = await hashPin(pin);
  return candidate === stored;
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