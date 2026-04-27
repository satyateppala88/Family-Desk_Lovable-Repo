import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

function relativeTime(from: number, to: number): string {
  const seconds = Math.max(0, Math.round((to - from) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Slim top-of-app banner that appears when the device is offline.
 * Read-only data still loads from the persisted React Query cache + the
 * service worker; this banner just makes it explicit so the user knows
 * mutating actions won't work until they reconnect.
 */
export const OfflineBanner = () => {
  const { isOnline, lastOnlineAt } = useOnlineStatus();
  const [visible, setVisible] = useState(!isOnline);
  const [now, setNow] = useState(Date.now());

  // Slight debounce on reconnect: keep banner visible for a moment so the
  // user sees confirmation rather than a flicker.
  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [isOnline]);

  // Refresh the relative-time label every 30s while offline.
  useEffect(() => {
    if (isOnline) return;
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, [isOnline]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors ${
        isOnline ? "bg-emerald-600" : "bg-amber-600"
      }`}
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      {isOnline ? (
        <span>Back online — refreshing your data…</span>
      ) : (
        <span>
          You're offline — showing data from {relativeTime(lastOnlineAt, now)}
        </span>
      )}
    </div>
  );
};