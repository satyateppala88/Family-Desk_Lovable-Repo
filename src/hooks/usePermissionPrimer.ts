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
  hasAskedPermission,
  isPermissionRemindActive,
  markPermissionAsked,
  setPermissionRemindLater,
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

/** Surfaces that bypass the per-capability "asked" gate (explicit user retry). */
const FORCE_SURFACES = new Set(["try-again", "voice-input-retry", "settings"]);

/**
 * Coordinates a "soft prompt → OS prompt" flow.
 *
 * Usage:
 *   const { ensurePermission, primerProps } = usePermissionPrimer();
 *   const ok = await ensurePermission("microphone", "voice-input");
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
      const force = FORCE_SURFACES.has(surface);
      const current = await queryPermission(kind);
      if (current === "granted") return true;
      if (current === "unsupported") return false;
      if (current === "denied") {
        toast.error(DENIED_HINTS[kind]);
        void logPermissionEvent(kind, "blocked", surface);
        return false;
      }

      // "prompt" — show our priming sheet first (unless suppressed).
      if (isSuppressed(kind)) {
        void logPermissionEvent(kind, "dismissed", surface, { reason: "suppressed" });
        return false;
      }

      // Respect an active "Remind me in 7 days" timer.
      if (!force && isPermissionRemindActive(kind)) {
        void logPermissionEvent(kind, "dismissed", surface, { reason: "snoozed" });
        return false;
      }

      // If we've already shown the contextual sheet for this capability,
      // skip the soft prompt and go straight to the OS request.
      if (!force && hasAskedPermission(kind)) {
        const result = await requestPermission(kind);
        if (result === "granted") {
          void logPermissionEvent(kind, "granted", surface);
          return true;
        }
        if (result === "denied") {
          toast.error(DENIED_HINTS[kind]);
          void logPermissionEvent(kind, "denied", surface);
        } else {
          void logPermissionEvent(kind, "denied", surface, { result });
        }
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
      // Mark as asked the moment the sheet closes (regardless of choice).
      if (state.kind) markPermissionAsked(state.kind);
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

  /** Secondary action for camera/photos — just close, no request. */
  const handleNotNow = useCallback(() => {
    if (state.kind) {
      void logPermissionEvent(state.kind, "dismissed", state.surface, { via: "not-now" });
    }
    closeWith(false);
  }, [state.kind, state.surface, closeWith]);

  /** Secondary action for microphone/notifications — set 7-day remind timer. */
  const handleRemindLater = useCallback(() => {
    if (state.kind) {
      setPermissionRemindLater(state.kind, 7);
      void logPermissionEvent(state.kind, "dismissed", state.surface, {
        via: "remind-7-days",
      });
    }
    closeWith(false);
  }, [state.kind, state.surface, closeWith]);

  const currentKind = state.kind ?? ("microphone" as PermissionKind);
  const usesRemind = currentKind === "microphone" || currentKind === "notifications";

  return {
    ensurePermission,
    /**
     * Mark the user's preference as "never ask again" for this capability.
     * Used by the in-app Settings page; not invoked by the contextual sheet.
     */
    suppress: (kind: PermissionKind) => suppressForever(kind),
    primerProps: {
      open: state.open,
      kind: currentKind,
      onAllow: handleAllow,
      onSecondary: usesRemind ? handleRemindLater : handleNotNow,
      onDismiss: usesRemind ? handleRemindLater : handleNotNow,
    },
  };
};
