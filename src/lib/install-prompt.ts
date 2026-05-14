/**
 * Helpers for the soft (in-app) PWA install prompt.
 *
 * Why a soft prompt?
 * - Chromium fires `beforeinstallprompt` when the app is installable, but
 *   if we call `prompt()` immediately the user gets ambushed and usually
 *   dismisses. Once dismissed, Chromium won't fire the event again for a
 *   while, so we lose the chance.
 * - We capture the event, then surface our own UI and only call `prompt()`
 *   when the user clicks "Install".
 * - On iOS Safari the event never fires, so we show platform-specific
 *   instructions instead.
 */

const DISMISSED_KEY = "familydesk:install-prompt-dismissed-at";
const SHOWN_COUNT_KEY = "familydesk:install-prompt-shown-count";
const INSTALLED_KEY = "familydesk:install-prompt-installed";

const REASK_AFTER_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const MAX_PROMPTS = 3;

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

/** True when the app is already running as an installed PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return Boolean(iosStandalone || displayStandalone);
}

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

/**
 * Was the install previously confirmed in this browser?
 *
 * NOTE: This is *not* used to hide the install UI, because Android/Chrome
 * doesn't notify the page when the user uninstalls the PWA — the flag would
 * stay `true` forever and the user could never re-install. Use
 * `isStandalone()` for "currently installed" checks. This helper is kept for
 * analytics / soft-prompt frequency only.
 */
export function wasInstalled(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Clear the "installed" flag. Call this whenever the browser fires
 * `beforeinstallprompt`, because that event only fires when the app is
 * installable — i.e. it is *not* currently installed. This recovers from
 * the stale-flag-after-uninstall case on Android.
 */
export function clearInstalledFlag(): void {
  try {
    window.localStorage.removeItem(INSTALLED_KEY);
  } catch {
    /* ignore */
  }
}

export function markInstalled(): void {
  try {
    window.localStorage.setItem(INSTALLED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowSoftPrompt(): boolean {
  // Only suppress when actually running standalone. The localStorage
  // "installed" flag is unreliable across uninstall on Android.
  if (isStandalone()) return false;

  try {
    const count = Number(window.localStorage.getItem(SHOWN_COUNT_KEY) ?? "0");
    if (count >= MAX_PROMPTS) return false;

    const dismissedAtRaw = window.localStorage.getItem(DISMISSED_KEY);
    if (!dismissedAtRaw) return true;
    const dismissedAt = Number(dismissedAtRaw);
    if (!Number.isFinite(dismissedAt)) return true;
    return Date.now() - dismissedAt > REASK_AFTER_MS;
  } catch {
    return true;
  }
}

export function markSoftPromptShown(): void {
  try {
    const count = Number(window.localStorage.getItem(SHOWN_COUNT_KEY) ?? "0");
    window.localStorage.setItem(SHOWN_COUNT_KEY, String(count + 1));
  } catch {
    /* ignore */
  }
}

export function markSoftPromptDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function suppressSoftPromptForever(): void {
  try {
    window.localStorage.setItem(SHOWN_COUNT_KEY, String(MAX_PROMPTS));
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}