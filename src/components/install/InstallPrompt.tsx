import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  isIos,
  isStandalone,
  markInstalled,
  markSoftPromptDismissed,
  markSoftPromptShown,
  shouldShowSoftPrompt,
  suppressSoftPromptForever,
  type BeforeInstallPromptEvent,
} from "@/lib/install-prompt";

/**
 * Soft PWA install prompt.
 *
 * UX rules:
 *  - Only signed-in users see it (we want them invested before asking).
 *  - Skipped entirely in iframes / Lovable preview hosts.
 *  - Hidden if already installed / running standalone.
 *  - On Android/desktop Chromium: waits for `beforeinstallprompt`, then
 *    shows after a 12s delay so it doesn't ambush a new session.
 *  - On iOS Safari: shows manual "Add to Home Screen" instructions.
 *  - Dismissible; re-shows after 14 days, capped at 3 lifetime asks.
 */
export const InstallPrompt = () => {
  const { user } = useAuth();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isStandalone()) return;

    // Skip in iframes / preview hosts.
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

    if (!shouldShowSoftPrompt()) return;

    const onAppInstalled = () => {
      markInstalled();
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    // iOS path: no beforeinstallprompt, show manual hint after delay.
    if (isIos()) {
      const t = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
        markSoftPromptShown();
      }, 12000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("appinstalled", onAppInstalled);
      };
    }

    // Chromium path: wait for the browser to say we're installable.
    let delayTimer: number | undefined;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferred(evt);
      delayTimer = window.setTimeout(() => {
        setVisible(true);
        markSoftPromptShown();
      }, 12000);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (delayTimer) window.clearTimeout(delayTimer);
    };
  }, [user]);

  const handleDismiss = () => {
    markSoftPromptDismissed();
    setVisible(false);
  };

  const handleNeverAsk = () => {
    suppressSoftPromptForever();
    setVisible(false);
    toast("We won't ask again. You can install anytime from /install.");
  };

  const handleInstall = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        markInstalled();
        toast.success("FamilyDesk installed — open it from your home screen anytime.");
      } else {
        markSoftPromptDismissed();
      }
    } catch {
      markSoftPromptDismissed();
    } finally {
      setInstalling(false);
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-desc"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm sm:px-0 animate-slide-in-up"
    >
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {iosHint ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="install-prompt-title" className="text-sm font-semibold leading-snug">
              {iosHint ? "Add FamilyDesk to your Home Screen" : "Install FamilyDesk as an app"}
            </h3>
            <p
              id="install-prompt-desc"
              className="mt-1 text-xs text-muted-foreground leading-relaxed"
            >
              {iosHint ? (
                <>
                  Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> in Safari's
                  toolbar, then choose <strong>Add to Home Screen</strong>. You'll get a faster,
                  full-screen experience with offline access.
                </>
              ) : (
                "Launch from your home screen, work offline, and get reminders — without opening a browser tab."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-3 py-2">
          {iosHint ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleNeverAsk} className="text-muted-foreground">
                Don't ask again
              </Button>
              <Button size="sm" onClick={handleDismiss}>
                Got it
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={handleNeverAsk} className="text-muted-foreground">
                Don't ask again
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
              <Button size="sm" onClick={handleInstall} disabled={installing || !deferred} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {installing ? "Installing…" : "Install"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};