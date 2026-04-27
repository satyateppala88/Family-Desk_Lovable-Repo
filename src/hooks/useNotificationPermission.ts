import { useEffect, useState } from "react";
import {
  getPermissionState,
  type PermissionState,
} from "@/lib/notification-permission";

/**
 * Reactive notification-permission state.
 *
 * Browsers don't fire a DOM event on `Notification.permission` directly, but
 * the Permissions API exposes a `PermissionStatus` whose `change` event fires
 * when the user toggles the permission in browser settings (or any other tab
 * does). We subscribe to that and fall back to focus/visibility polling for
 * older browsers (notably Safari < 16) and for the "unsupported" case.
 */
export function useNotificationPermission(): PermissionState {
  const [state, setState] = useState<PermissionState>(() => getPermissionState());

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let status: PermissionStatus | null = null;

    const sync = () => {
      if (cancelled) return;
      setState(getPermissionState());
    };

    // Always re-check when the tab becomes visible / focused. This catches
    // browsers without Permissions API support, and also the case where the
    // user changes permission via the URL bar lock icon while the same tab
    // is in the background (some browsers don't fire change in that case).
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    // Subscribe to live permission changes if supported.
    const permissions = (navigator as Navigator & {
      permissions?: { query: (d: PermissionDescriptor) => Promise<PermissionStatus> };
    }).permissions;

    if (permissions?.query) {
      permissions
        .query({ name: "notifications" as PermissionName })
        .then((s) => {
          if (cancelled) return;
          status = s;
          // Update once with the current state from the Permissions API.
          sync();
          status.addEventListener("change", sync);
        })
        .catch(() => {
          // Some browsers throw for unsupported descriptors — ignore and rely
          // on focus/visibility fallback.
        });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      if (status) status.removeEventListener("change", sync);
    };
  }, []);

  return state;
}