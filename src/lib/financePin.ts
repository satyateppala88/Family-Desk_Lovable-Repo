const PIN_HASH_KEY = "familydesk_finance_pin_hash";
const UNLOCK_KEY = "finance_unlocked_at";

export const hashPin = async (pin: string): Promise<string> => {
  const enc = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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