import { useEffect, useRef, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Small toast-style pill that appears when the device transitions from
 * offline → online. It triggers a background refetch of any stale queries
 * and stays visible while React Query is fetching, then briefly shows a
 * "Synced" confirmation before disappearing.
 *
 * Sits below the OfflineBanner reconnect flash so the user sees both:
 *  - top banner: "Back online — refreshing your data…" (1.5s)
 *  - this pill:  "Syncing changes…" → "Synced"
 */
export const SyncingIndicator = () => {
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const fetchingCount = useIsFetching();

  const wasOfflineRef = useRef<boolean>(!isOnline);
  const [phase, setPhase] = useState<"hidden" | "syncing" | "done">("hidden");

  // Detect the offline → online transition and kick off a refetch.
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setPhase("syncing");
      // Refresh anything stale so the indicator has work to reflect.
      queryClient.invalidateQueries();
    }
  }, [isOnline, queryClient]);

  // Once syncing and all fetches settle, show "Synced" then hide.
  useEffect(() => {
    if (phase !== "syncing") return;
    if (fetchingCount > 0) return;

    // Small grace period so a single quick refetch still feels confirmed.
    const t = setTimeout(() => setPhase("done"), 250);
    return () => clearTimeout(t);
  }, [phase, fetchingCount]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("hidden"), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "hidden") return null;

  const isDone = phase === "done";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-12 z-50 -translate-x-1/2 animate-fade-in"
    >
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors ${
          isDone
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border bg-card/95 text-foreground"
        }`}
      >
        {isDone ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Synced</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>Syncing changes…</span>
          </>
        )}
      </div>
    </div>
  );
};