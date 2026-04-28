const INTRO_KEY = "familydesk_has_seen_intro";

export const getHasSeenIntro = (): boolean =>
  localStorage.getItem(INTRO_KEY) === "true";

export const setHasSeenIntro = (): void =>
  localStorage.setItem(INTRO_KEY, "true");

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
