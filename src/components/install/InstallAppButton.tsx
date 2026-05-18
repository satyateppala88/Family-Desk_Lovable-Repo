import { useEffect, useState } from "react";
import { Download, Share, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  isIos,
  isStandalone,
  markInstalled,
  clearInstalledFlag,
  type BeforeInstallPromptEvent,
} from "@/lib/install-prompt";

interface InstallAppButtonProps {
  /** Visual variant of the trigger button. */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Size of the trigger button. */
  size?: "default" | "sm" | "lg";
  /** Optional className override. */
  className?: string;
  /** Custom label (defaults to "Install app"). */
  label?: string;
  /** Render full-width. */
  fullWidth?: boolean;
}

/**
 * Explicit, user-initiated PWA install trigger.
 *
 * Behavior:
 *  - Hidden entirely when the app is already running standalone or was
 *    previously installed in this browser.
 *  - Hidden inside the Lovable preview iframe (PWA install can't be
 *    triggered from a framed origin anyway).
 *  - On Chromium (Android / desktop): captures `beforeinstallprompt`
 *    and calls `prompt()` on tap. If the event hasn't fired yet, the
 *    button is shown but disabled with a hint.
 *  - On iOS Safari: opens a small dialog with Add-to-Home-Screen steps.
 */
export const InstallAppButton = ({
  variant = "default",
  size = "default",
  className,
  label = "Install app",
  fullWidth = false,
}: InstallAppButtonProps) => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // Only treat the app as installed when actually running standalone.
  // localStorage flags don't survive uninstall on Android, so relying on
  // them would lock users out of re-installing.
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [installing, setInstalling] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip in iframes / Lovable preview hosts — install cannot be invoked there.
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }
    const previewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");
    if (inIframe || previewHost) return;

    // iOS: no beforeinstallprompt, but we can still surface the button
    // with an instructional fallback.
    if (isIos()) {
      setSupported(true);
      return;
    }

    // Chromium: only mark supported once the browser tells us we're installable.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      // The browser only fires this when the app is NOT currently
      // installed — clear any stale flag from a previous install.
      clearInstalledFlag();
      setDeferred(e as BeforeInstallPromptEvent);
      setSupported(true);
      setInstalled(false);
    };
    const onInstalled = () => {
      markInstalled();
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    const createdAt = (user as any)?.created_at;
    const isNewInstall = !!createdAt &&
      (Date.now() - new Date(createdAt).getTime()) < 10 * 60 * 1000;
    if (!isNewInstall) return null;
    return (
      <div
        className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${
          fullWidth ? "w-full justify-center" : ""
        } ${className ?? ""}`}
      >
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>App installed</span>
      </div>
    );
  }

  if (!supported) {
    // Browser doesn't support install (e.g. Firefox desktop, in-app browsers,
    // or Chromium hasn't decided we're installable yet). Stay quiet rather
    // than showing a dead button.
    return null;
  }

  const handleClick = async () => {
    if (isIos()) {
      setIosOpen(true);
      return;
    }
    if (!deferred) {
      toast("Your browser will offer install from its menu (⋮) → Install app.");
      return;
    }
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        markInstalled();
        setInstalled(true);
        toast.success("Family Desk installed — open it from your home screen anytime.");
      }
    } catch {
      // User cancelled or browser refused — silently ignore.
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={installing}
        className={`${fullWidth ? "w-full" : ""} gap-2 ${className ?? ""}`}
      >
        <Download className="h-4 w-4" />
        {installing ? "Installing…" : label}
      </Button>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Add Family Desk to your Home Screen
            </DialogTitle>
            <DialogDescription>
              Safari on iPhone and iPad doesn&rsquo;t offer a one-tap install,
              but you can add Family Desk to your Home Screen in three quick
              steps.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                1
              </span>
              <span>
                Tap the{" "}
                <Share className="inline h-4 w-4 align-text-bottom" />{" "}
                <strong>Share</strong> button in Safari&rsquo;s toolbar.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                2
              </span>
              <span>
                Scroll and choose <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                3
              </span>
              <span>
                Tap <strong>Add</strong> in the top-right corner. Family Desk
                will launch full-screen, just like a native app.
              </span>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Tip: this only works in Safari, not inside Chrome or in-app browsers
            on iOS.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButton;