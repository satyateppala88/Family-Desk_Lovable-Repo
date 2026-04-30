import { AlertCircle, RefreshCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PermissionKind } from "@/lib/permissions";
import { usePermissionRetry } from "@/hooks/usePermissionRetry";

const isNative = (): boolean =>
  typeof window !== "undefined" &&
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();

const openOSSettings = async () => {
  if (isNative()) {
    try {
      const moduleName = "@capacitor/app";
      const mod: unknown = await import(/* @vite-ignore */ moduleName);
      const App = (mod as { App?: { openSettings?: () => Promise<void> } }).App;
      if (App?.openSettings) {
        await App.openSettings();
        return;
      }
    } catch (err) {
      console.warn("[permissions] failed to open native settings:", err);
    }
    toast.info("Open your device's Settings app, find Family Desk, and adjust permissions there.");
    return;
  }

  const ua = navigator.userAgent.toLowerCase();
  let hint = "Open your browser's site settings to change permissions for Family Desk.";
  if (ua.includes("chrome") || ua.includes("edg")) {
    hint = "Tap the lock icon (🔒) next to the address bar → Site settings to change permissions.";
  } else if (ua.includes("firefox")) {
    hint = "Tap the lock icon (🔒) next to the address bar → Connection secure → More information → Permissions.";
  } else if (ua.includes("safari")) {
    hint = "Open Safari → Settings → Websites to change permissions for Family Desk.";
  }
  toast.info(hint, { duration: 7000 });
};

const COPY: Record<PermissionKind, { dismissed: string; blocked: string }> = {
  microphone: {
    dismissed: "Microphone is off — tap Try again to use voice input.",
    blocked: "Microphone is blocked. Re-enable it in settings to use voice input.",
  },
  camera: {
    dismissed: "Camera is off — tap Try again to take a photo.",
    blocked: "Camera is blocked. Re-enable it in settings to take a photo.",
  },
  photos: {
    dismissed: "Photo access is off — tap Try again to pick a picture.",
    blocked: "Photo access is blocked. Re-enable it in settings to pick a picture.",
  },
  notifications: {
    dismissed: "Reminders are off — tap Try again to receive them.",
    blocked: "Notifications are blocked. Re-enable them in settings to receive reminders.",
  },
};

interface PermissionRetryHintProps {
  kind: PermissionKind;
  /** Same `ensurePermission` returned by `usePermissionPrimer`. */
  ensurePermission: (k: PermissionKind, surface?: string) => Promise<boolean>;
  /** Analytics surface label, e.g. "voice-input" or "avatar-uploader". */
  surface: string;
  /** Optional callback after a successful re-grant. */
  onGranted?: () => void;
  className?: string;
}

/**
 * Inline hint shown next to a feature when its required capability was
 * previously denied or dismissed. Renders nothing when the capability is
 * granted, prompt-able for the first time, or unsupported.
 */
export const PermissionRetryHint = ({
  kind,
  ensurePermission,
  surface,
  onGranted,
  className,
}: PermissionRetryHintProps) => {
  const { needsRetry, isOSBlocked, tryAgain } = usePermissionRetry(kind);

  if (!needsRetry) return null;

  const copy = isOSBlocked ? COPY[kind].blocked : COPY[kind].dismissed;

  const handleClick = async () => {
    if (isOSBlocked) {
      await openOSSettings();
      return;
    }
    const granted = await tryAgain(ensurePermission, surface);
    if (granted) onGranted?.();
  };

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-xs ${className ?? ""}`}
      role="status"
    >
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground leading-snug">{copy}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={isOSBlocked ? "default" : "outline"}
        onClick={handleClick}
        className="h-7 px-2.5 text-xs shrink-0"
      >
        {isOSBlocked ? (
          <>
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Open settings
          </>
        ) : (
          <>
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
            Try again
          </>
        )}
      </Button>
    </div>
  );
};