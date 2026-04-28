import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  isIosNeedsInstall,
  markSoftPromptDismissed,
  markSoftPromptShown,
  requestNativePermission,
  shouldShowSoftPrompt,
  suppressSoftPromptForever,
} from "@/lib/notification-permission";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { ensurePushSubscription } from "@/lib/push-subscription";

/**
 * Soft permission prompt shown BEFORE the browser's native dialog.
 *
 * UX rules:
 *  - Only signed-in users see it.
 *  - Skipped entirely in iframes / Lovable preview (matches PWA constraints).
 *  - Delayed by 8s after page load so it doesn't ambush a new user.
 *  - Dismissible; re-shows after 14 days, capped at 3 lifetime asks.
 *  - If permission is already granted or denied, never shows.
 *  - On iOS Safari without "Add to Home Screen", explains the prerequisite
 *    instead of triggering a prompt that wouldn't work.
 */
export const NotificationPermissionPrompt = () => {
  const { user } = useAuth();
  const permission = useNotificationPermission();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Never show inside iframes / Lovable preview hosts.
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

    const iosNeedsInstall = isIosNeedsInstall();
    if (iosNeedsInstall) {
      // Show the iOS install hint at most once per 14 days.
      if (!shouldShowSoftPrompt()) return;
      const t = setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
        markSoftPromptShown();
      }, 8000);
      return () => clearTimeout(t);
    }

    if (!shouldShowSoftPrompt()) return;

    const t = setTimeout(() => {
      setVisible(true);
      markSoftPromptShown();
    }, 8000);
    return () => clearTimeout(t);
  }, [user]);

  const handleDismiss = () => {
    markSoftPromptDismissed();
    setVisible(false);
  };

  const handleNotNow = () => {
    handleDismiss();
  };

  const handleNeverAsk = () => {
    suppressSoftPromptForever();
    setVisible(false);
    toast("We won't ask again. You can enable notifications later in Settings.");
  };

  const handleEnable = async () => {
    setRequesting(true);
    const result = await requestNativePermission();

    if (result === "granted") {
      const sub = await ensurePushSubscription();
      setRequesting(false);
      if (sub.ok) {
        toast.success(
          "Notifications enabled — you'll get reminders for tasks, habits and more."
        );
      } else {
        toast.success(
          "Notifications enabled. We'll finish setup the next time you open the app."
        );
        console.warn(
          "[push] subscription setup failed:",
          (sub as { reason: string }).reason
        );
      }
      suppressSoftPromptForever();
    } else if (result === "denied") {
      setRequesting(false);
      toast.error(
        "Notifications blocked. You can re-enable them from your browser's site settings."
      );
      suppressSoftPromptForever();
    } else {
      setRequesting(false);
      // "default" means the user closed the prompt without choosing.
      markSoftPromptDismissed();
    }
    setVisible(false);
  };

  // Whether the soft prompt is actually being rendered right now. Other
  // bottom-right floats (the AI chat FAB) read this via `body[data-notif-primer-open]`
  // so they can lift themselves above the card and avoid overlapping it.
  const isShowing =
    visible && permission !== "granted" && permission !== "denied";

  useEffect(() => {
    if (!isShowing) return;
    document.body.dataset.notifPrimerOpen = "true";
    return () => {
      delete document.body.dataset.notifPrimerOpen;
    };
  }, [isShowing]);

  if (!isShowing) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="notif-prompt-title"
      aria-describedby="notif-prompt-desc"
      data-bottom-card="notif-primer"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm sm:px-0 animate-slide-in-up"
    >
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {showIosHint ? <Smartphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="notif-prompt-title"
              className="text-sm font-semibold leading-snug"
            >
              {showIosHint
                ? "Install FamilyDesk for notifications"
                : "Stay on top of your day?"}
            </h3>
            <p
              id="notif-prompt-desc"
              className="mt-1 text-xs text-muted-foreground leading-relaxed"
            >
              {showIosHint
                ? "On iPhone, FamilyDesk needs to be added to your Home Screen first. Tap the Share icon in Safari, then 'Add to Home Screen' — then come back to enable reminders."
                : "Get gentle reminders for tasks, habits, meal plans and pantry alerts. We'll only notify you for things you've asked us to track — never marketing."}
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
          {showIosHint ? (
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Got it
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNeverAsk}
                className="gap-1.5 text-muted-foreground"
              >
                <BellOff className="h-3.5 w-3.5" />
                Don't ask again
              </Button>
              <Button size="sm" variant="ghost" onClick={handleNotNow}>
                Not now
              </Button>
              <Button size="sm" onClick={handleEnable} disabled={requesting}>
                {requesting ? "Asking…" : "Yes, enable"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};