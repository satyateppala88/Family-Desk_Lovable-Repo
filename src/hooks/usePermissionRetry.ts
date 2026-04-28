import { useCallback, useEffect, useState } from "react";
import {
  clearSuppression,
  isSuppressed,
  type PermissionKind,
  type PermissionState,
  queryPermission,
} from "@/lib/permissions";

/**
 * Tracks whether a capability is currently in a "needs retry" state — i.e.
 * the user previously denied the OS prompt OR dismissed our soft primer
 * with "Not now" — and exposes a single `tryAgain()` action that clears
 * any local suppression and re-runs the standard `ensurePermission` flow.
 *
 * Intended for inline "Try again" affordances inside features (mic icon,
 * avatar uploader, etc.) so users can recover without hunting through
 * Settings.
 *
 * NOTE: This hook does not own the primer. Callers continue to use
 * `usePermissionPrimer` and pass its `ensurePermission` to `tryAgain`.
 */
export const usePermissionRetry = (kind: PermissionKind) => {
  const [state, setState] = useState<PermissionState>("prompt");
  const [suppressed, setSuppressed] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    const s = await queryPermission(kind);
    setState(s);
    setSuppressed(isSuppressed(kind));
  }, [kind]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  /**
   * True when we should surface a "Try again" UI:
   *  - OS-level denied (blocked), OR
   *  - user previously dismissed our soft primer (suppressed).
   * "prompt" / "granted" / "unsupported" → no retry UI needed.
   */
  const needsRetry = state === "denied" || suppressed;

  /** True when the only path forward is the OS settings app. */
  const isOSBlocked = state === "denied";

  /**
   * Re-attempt the permission flow. Caller passes the bound
   * `ensurePermission` from `usePermissionPrimer` plus a surface label.
   * Always clears local suppression first so the soft primer can re-show.
   */
  const tryAgain = useCallback(
    async (
      ensurePermission: (k: PermissionKind, surface?: string) => Promise<boolean>,
      surface: string = "try-again"
    ): Promise<boolean> => {
      if (suppressed) clearSuppression(kind);
      const granted = await ensurePermission(kind, surface);
      await refresh();
      return granted;
    },
    [kind, suppressed, refresh]
  );

  return { state, suppressed, needsRetry, isOSBlocked, tryAgain, refresh };
};