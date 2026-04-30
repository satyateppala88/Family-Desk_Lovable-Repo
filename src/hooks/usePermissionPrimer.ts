import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  isSuppressed,
  type PermissionKind,
  queryPermission,
  requestPermission,
  suppressForever,
} from "@/lib/permissions";
import { logPermissionEvent } from "@/lib/permissionAnalytics";
import {
  clearPermissionSnooze,
  getPermissionSnoozeUntil,
  isPermissionSnoozed,
} from "@/lib/launchStorage";

interface PrimerState {
  open: boolean;
  kind: PermissionKind | null;
  resolve: ((granted: boolean) => void) | null;
  surface: string;
}

const DENIED_HINTS: Record<PermissionKind, string> = {
  microphone:
    "Microphone access is blocked. Enable it from your browser/site settings to use voice input.",
  camera:
    "Camera access is blocked. Enable it from your browser/site settings to take a photo.",
  photos:
    "Photo access is blocked. Enable it from your device settings to pick an image.",
  notifications:
    "Notifications are blocked. Enable them from your browser/site settings to receive reminders.",
};

/**
 * Coordinates a "soft prompt → OS prompt" flow.
 *
 * Usage:
 *   const { ensurePermission, primerProps } = usePermissionPrimer();
 *   const ok = await ensurePermission("microphone");
 *   if (ok) startRecording();
 *
 * Then render `<PermissionPrimerDialog {...primerProps} />` once in the tree.
 */
export const usePermissionPrimer = () => {
  const [state, setState] = useState<PrimerState>({
    open: false,
    kind: null,
    resolve: null,
    surface: "unknown",
  });

  const ensurePermission = useCallback(
    async (kind: PermissionKind, surface: string = "unknown"): Promise<boolean> => {
      const current = await queryPermission(kind);
      if (current === "granted") {
        clearPermissionSnooze(kind);
        return true;
      }
      if (current === "unsupported") return false;
      if (current === "denied") {
        toast.error(DENIED_HINTS[kind]);
        void logPermissionEvent(kind, "blocked", surface);
        return false;
      }

      // "prompt" — show our priming dialog first (unless suppressed).
      if (isSuppressed(kind)) {
        void logPermissionEvent(kind, "dismissed", surface, { reason: "suppressed" });
        return false;
      }

      // Respect an active "Remind me later" snooze, except when the
      // user explicitly retries from a "Try again" affordance.
      if (surface !== "try-again" && isPermissionSnoozed(kind)) {
        void logPermissionEvent(kind, "dismissed", surface, {
          reason: "snoozed",
          until: getPermissionSnoozeUntil(kind),
        });
        return false;
      }

      void logPermissionEvent(kind, "prompted", surface);
      return new Promise<boolean>((resolve) => {
        setState({ open: true, kind, resolve, surface });
      });
    },
    []
  );

  const closeWith = useCallback(
    (granted: boolean) => {
      state.resolve?.(granted);
      setState({ open: false, kind: null, resolve: null, surface: "unknown" });
    },
    [state]
  );

  const handleAllow = useCallback(async () => {
    const kind = state.kind;
    const surface = state.surface;
    if (!kind) return closeWith(false);
    const result = await requestPermission(kind);
    if (result === "granted") {
      void logPermissionEvent(kind, "granted", surface);
      clearPermissionSnooze(kind);
      closeWith(true);
      return;
    }
    if (result === "denied") {
      toast.error(DENIED_HINTS[kind]);
      void logPermissionEvent(kind, "denied", surface);
    } else {
      void logPermissionEvent(kind, "denied", surface, { result });
    }
    closeWith(false);
  }, [state.kind, state.surface, closeWith]);

  const handleDecline = useCallback(() => {
    if (state.kind) {
      suppressForever(state.kind);
      void logPermissionEvent(state.kind, "dismissed", state.surface, { via: "primer-cancel" });
    }
    closeWith(false);
  }, [state.kind, state.surface, closeWith]);

  return {
    ensurePermission,
    primerProps: {
      open: state.open,
      kind: state.kind ?? ("microphone" as PermissionKind),
      onAllow: handleAllow,
      onDecline: handleDecline,
    },
  };
};