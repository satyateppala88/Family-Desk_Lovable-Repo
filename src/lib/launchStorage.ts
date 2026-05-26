const INTRO_KEY = "familydesk_has_seen_intro";

export const getHasSeenIntro = (): boolean =>
  localStorage.getItem(INTRO_KEY) === "true";

export const setHasSeenIntro = (): void =>
  localStorage.setItem(INTRO_KEY, "true");

/* ---------- Welcome Feature Tour (post-install / first-launch) ---------- */

const FEATURE_TOUR_KEY = "fd_onboarding_seen";

export const getHasSeenFeatureTour = (): boolean => {
  try {
    return Boolean(localStorage.getItem(FEATURE_TOUR_KEY));
  } catch {
    return true; // fail-closed: don't replay if storage unavailable
  }
};

export const setHasSeenFeatureTour = (): void => {
  try {
    localStorage.setItem(FEATURE_TOUR_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
};

export const clearHasSeenFeatureTour = (): void => {
  try {
    localStorage.removeItem(FEATURE_TOUR_KEY);
  } catch {
    /* ignore */
  }
};

/* ---------- Contextual permission tracking (per-capability) ---------- */

import type { PermissionKind } from "@/lib/permissions";

const ASKED_KEYS: Record<PermissionKind, string> = {
  microphone: "fd_perm_mic_asked",
  camera: "fd_perm_camera_asked",
  photos: "fd_perm_photos_asked",
  notifications: "fd_perm_notif_asked",
};

const REMIND_KEYS: Partial<Record<PermissionKind, string>> = {
  microphone: "fd_perm_mic_remind",
  notifications: "fd_perm_notif_remind",
};

const safeGet = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string): void => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};
const safeRemove = (k: string): void => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
};

export const hasAskedPermission = (kind: PermissionKind): boolean =>
  safeGet(ASKED_KEYS[kind]) === "true";

export const markPermissionAsked = (kind: PermissionKind): void =>
  safeSet(ASKED_KEYS[kind], "true");

export const setPermissionRemindLater = (kind: PermissionKind, days = 7): void => {
  const key = REMIND_KEYS[kind];
  if (!key) return;
  safeSet(key, String(Date.now() + days * 24 * 60 * 60 * 1000));
};

export const isPermissionRemindActive = (kind: PermissionKind): boolean => {
  const key = REMIND_KEYS[kind];
  if (!key) return false;
  const raw = safeGet(key);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) { safeRemove(key); return false; }
  return Date.now() < ts;
};

/**
 * On app launch: for any expired remind timer, clear both the remind key
 * and the asked key so the contextual sheet can show again on next trigger.
 */
export const processExpiredPermissionReminds = (): void => {
  (Object.keys(REMIND_KEYS) as PermissionKind[]).forEach((kind) => {
    const key = REMIND_KEYS[kind]!;
    const raw = safeGet(key);
    if (!raw) return;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() >= ts) {
      safeRemove(key);
      safeRemove(ASKED_KEYS[kind]);
    }
  });
};

/* ---------- Per-capability snooze ---------- */

const SNOOZE_KEY = "familydesk_permission_snooze_v1";

type SnoozeMap = Record<string, string>; // kind → ISO date when snooze ends

const readSnoozeMap = (): SnoozeMap => {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SnoozeMap) : {};
  } catch {
    return {};
  }
};

const writeSnoozeMap = (map: SnoozeMap): void => {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

/** Snooze a capability prompt for `days` days from now. Returns the ISO end timestamp. */
export const snoozePermission = (kind: string, days: number): string => {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const map = readSnoozeMap();
  map[kind] = until;
  writeSnoozeMap(map);
  return until;
};

/** True if a snooze for this capability is still active. Auto-cleans expired entries. */
export const isPermissionSnoozed = (kind: string): boolean => {
  const map = readSnoozeMap();
  const until = map[kind];
  if (!until) return false;
  if (new Date(until).getTime() > Date.now()) return true;
  delete map[kind];
  writeSnoozeMap(map);
  return false;
};

/** Returns the ISO timestamp when the snooze ends, or null if not snoozed / expired. */
export const getPermissionSnoozeUntil = (kind: string): string | null => {
  const map = readSnoozeMap();
  const until = map[kind];
  if (!until) return null;
  if (new Date(until).getTime() > Date.now()) return until;
  return null;
};

/** Clear any active snooze for this capability (e.g. after the user grants it). */
export const clearPermissionSnooze = (kind: string): void => {
  const map = readSnoozeMap();
  if (kind in map) {
    delete map[kind];
    writeSnoozeMap(map);
  }
};
