import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  isSuppressed,
  type PermissionKind,
  queryPermission,
  requestPermission,
  suppressForever,
} from "@/lib/permissions";

interface PrimerState {
  open: boolean;
  kind: PermissionKind | null;
  resolve: ((granted: boolean) => void) | null;
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
  });

  const ensurePermission = useCallback(
    async (kind: PermissionKind): Promise<boolean> => {
      const current = await queryPermission(kind);
      if (current === "granted") return true;
      if (current === "unsupported") return false;
      if (current === "denied") {
        toast.error(DENIED_HINTS[kind]);
        return false;
      }

      // "prompt" — show our priming dialog first (unless suppressed).
      if (isSuppressed(kind)) return false;

      return new Promise<boolean>((resolve) => {
        setState({ open: true, kind, resolve });
      });
    },
    []
  );

  const closeWith = useCallback(
    (granted: boolean) => {
      state.resolve?.(granted);
      setState({ open: false, kind: null, resolve: null });
    },
    [state]
  );

  const handleAllow = useCallback(async () => {
    const kind = state.kind;
    if (!kind) return closeWith(false);
    const result = await requestPermission(kind);
    if (result === "granted") {
      closeWith(true);
      return;
    }
    if (result === "denied") {
      toast.error(DENIED_HINTS[kind]);
    }
    closeWith(false);
  }, [state.kind, closeWith]);

  const handleDecline = useCallback(() => {
    if (state.kind) suppressForever(state.kind);
    closeWith(false);
  }, [state.kind, closeWith]);

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