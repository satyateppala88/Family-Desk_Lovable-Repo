const INTRO_KEY = "familydesk_has_seen_intro";

export const getHasSeenIntro = (): boolean =>
  localStorage.getItem(INTRO_KEY) === "true";

export const setHasSeenIntro = (): void =>
  localStorage.setItem(INTRO_KEY, "true");

/* ---------- Welcome Feature Tour (post-install / first-launch) ---------- */

const FEATURE_TOUR_KEY = "familydesk_has_seen_feature_tour_v1";

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

const PERMISSIONS_TUTORIAL_KEY = "familydesk_has_seen_permissions_tutorial";

export const getHasSeenPermissionsTutorial = (): boolean => {
  try {
    return localStorage.getItem(PERMISSIONS_TUTORIAL_KEY) === "true";
  } catch {
    return true; // fail-closed: don't nag if storage unavailable
  }
};

export const setHasSeenPermissionsTutorial = (): void => {
  try {
    localStorage.setItem(PERMISSIONS_TUTORIAL_KEY, "true");
  } catch {
    /* ignore */
  }
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
