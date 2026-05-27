import { useEffect, useState } from "react";
import { BellOff, X } from "lucide-react";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

const DISMISS_KEY = "fd_notif_blocked_banner_dismissed";

/**
 * Slim 32px banner shown directly under the header when the browser/OS has
 * blocked notifications. Replaces the floating toast that previously
 * appeared mid-page on every dashboard load.
 */
export const NotificationsBlockedBanner = () => {
  const permission = useNotificationPermission();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
    } catch {
      /* sessionStorage unavailable — banner just shows for the session */
    }
  }, []);

  if (permission !== "denied" || dismissed) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex items-center gap-2 h-8 px-3 mb-3 rounded-md bg-warning/10 border border-warning/30 text-[12px] text-warning-foreground"
      style={{ color: "hsl(var(--warning))" }}
    >
      <BellOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 truncate leading-none">
        Notifications are blocked — enable them in your browser settings to get reminders.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 rounded hover:bg-warning/20 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};