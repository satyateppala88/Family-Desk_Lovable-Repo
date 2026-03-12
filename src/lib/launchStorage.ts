const INTRO_KEY = "familydesk_has_seen_intro";

export const getHasSeenIntro = (): boolean =>
  localStorage.getItem(INTRO_KEY) === "true";

export const setHasSeenIntro = (): void =>
  localStorage.setItem(INTRO_KEY, "true");
