/**
 * Helpers for the soft (in-app) notification permission flow.
 *
 * Why soft-ask first?
 * - Once a user clicks "Block" on the browser's native permission prompt,
 *   the only way to re-enable notifications is via browser settings — most
 *   users never do that. Apple, Mozilla, and Google all recommend showing
 *   a UI explanation BEFORE triggering the native prompt.
 * - We only call `Notification.requestPermission()` after the user clicks
 *   "Yes, enable" in our own dialog.
 */

const DISMISSED_KEY = "familydesk:notif-prompt-dismissed-at";
const SHOWN_COUNT_KEY = "familydesk:notif-prompt-shown-count";

// How long to wait before re-asking after a user dismisses the soft prompt.
const REASK_AFTER_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const MAX_PROMPTS = 3;

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function getPermissionState(): PermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return window.Notification.permission as PermissionState;
}

/** True when the soft prompt should be offered to the user right now. */
export function shouldShowSoftPrompt(): boolean {
  if (getPermissionState() !== "default") return false;

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
    /* ignore quota errors */
  }
}

export function markSoftPromptDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Permanently silence the soft prompt for this device. */
export function suppressSoftPromptForever(): void {
  try {
    window.localStorage.setItem(SHOWN_COUNT_KEY, String(MAX_PROMPTS));
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Triggers the browser's native permission dialog. Only call after the
 * user has explicitly opted in via the soft prompt UI.
 */
export async function requestNativePermission(): Promise<PermissionState> {
  if (getPermissionState() === "unsupported") return "unsupported";
  try {
    const result = await window.Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return "denied";
  }
}

/** True for iOS Safari that has not been added to the home screen. */
export function isIosNeedsInstall(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (!isIos) return false;
  // Web Push on iOS only works in installed PWAs.
  const standalone =
    // iOS-specific
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  return !standalone;
}