/**
 * Unified runtime-permission helpers for sensitive capabilities used
 * across Family Desk: microphone, camera, photo library, and notifications.
 *
 * Design principles (mirrors Apple/Google/Mozilla guidance):
 *  - Always show an in-app **priming** dialog with a clear reason BEFORE
 *    triggering the OS prompt. Once a user taps "Block" on the OS prompt,
 *    re-enabling requires a trip to system settings — most users never do.
 *  - Only ask at the moment the feature is first used (not on launch).
 *  - Remember per-capability "don't ask again" choices in localStorage so
 *    we never re-ambush the user.
 *
 * Works in both PWA (browser) and Capacitor (native) builds. Native plugins
 * are imported lazily so web bundles don't pull them in.
 */

export type PermissionKind =
  | "microphone"
  | "camera"
  | "photos"
  | "notifications";

export type PermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

const SUPPRESS_PREFIX = "familydesk:perm-suppressed:";

/** True if user previously chose "Don't ask again" for this capability. */
export const isSuppressed = (kind: PermissionKind): boolean => {
  try {
    return window.localStorage.getItem(SUPPRESS_PREFIX + kind) === "1";
  } catch {
    return false;
  }
};

export const suppressForever = (kind: PermissionKind): void => {
  try {
    window.localStorage.setItem(SUPPRESS_PREFIX + kind, "1");
  } catch {
    /* ignore */
  }
};

export const clearSuppression = (kind: PermissionKind): void => {
  try {
    window.localStorage.removeItem(SUPPRESS_PREFIX + kind);
  } catch {
    /* ignore */
  }
};

/** Detect whether we're running inside a native Capacitor shell. */
const isNative = (): boolean => {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
};

/** Inspect current OS-level permission state without prompting. */
export const queryPermission = async (
  kind: PermissionKind
): Promise<PermissionState> => {
  if (typeof window === "undefined") return "unsupported";

  // Notifications: cheap synchronous check.
  if (kind === "notifications") {
    if (!("Notification" in window)) return "unsupported";
    const p = window.Notification.permission;
    if (p === "granted") return "granted";
    if (p === "denied") return "denied";
    return "prompt";
  }

  // Microphone / camera / photos via the standard Permissions API when
  // available. Note: "photos" has no equivalent web permission — we just
  // return "prompt" so the picker is opened on demand.
  if (kind === "photos") return "prompt";

  const permName = kind === "microphone" ? "microphone" : "camera";
  const permissions = (
    navigator as Navigator & {
      permissions?: { query: (d: PermissionDescriptor) => Promise<PermissionStatus> };
    }
  ).permissions;

  if (!permissions?.query) return "prompt";
  try {
    const status = await permissions.query({
      name: permName as PermissionName,
    });
    return status.state as PermissionState;
  } catch {
    return "prompt";
  }
};

/**
 * Trigger the OS-level permission prompt. ONLY call after the priming UI.
 * Returns the resulting state.
 */
export const requestPermission = async (
  kind: PermissionKind
): Promise<PermissionState> => {
  // ----- Native (Capacitor) path -----
  if (isNative()) {
    try {
      if (kind === "notifications") {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const res = await PushNotifications.requestPermissions();
        return res.receive === "granted" ? "granted" : "denied";
      }
      if (kind === "camera" || kind === "photos") {
        const { Camera } = await import("@capacitor/camera");
        const res = await Camera.requestPermissions({
          permissions: kind === "camera" ? ["camera"] : ["photos"],
        });
        const state = kind === "camera" ? res.camera : res.photos;
        return state === "granted" || state === "limited" ? "granted" : "denied";
      }
      // Microphone on native — fall through to getUserMedia below; the OS
      // dialog will be triggered by the WebView.
    } catch (err) {
      console.warn("[permissions] native request failed:", err);
      return "denied";
    }
  }

  // ----- Web path -----
  if (kind === "notifications") {
    if (!("Notification" in window)) return "unsupported";
    try {
      const r = await window.Notification.requestPermission();
      return r as PermissionState;
    } catch {
      return "denied";
    }
  }

  if (kind === "microphone") {
    if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need the stream — we only wanted the prompt. Stop it now.
      stream.getTracks().forEach((t) => t.stop());
      return "granted";
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") return "denied";
      return "denied";
    }
  }

  if (kind === "camera") {
    if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      return "granted";
    } catch {
      return "denied";
    }
  }

  // Photos on web = file input picker, no permission needed.
  if (kind === "photos") return "granted";

  return "unsupported";
};