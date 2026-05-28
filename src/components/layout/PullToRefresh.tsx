import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

/**
 * Global pull-to-refresh gesture for mobile viewports.
 *
 * Listens to touch events on the document. When the user is at the very
 * top of the page and drags downward past a threshold, a spinner pill
 * fades in. On release we invalidate the React Query cache so every
 * mounted screen re-fetches its data.
 *
 * Disabled on desktop (>=1024px) and when scroll position is not at the
 * top, so it never fights the native scroll inside lists or sheets.
 */

const THRESHOLD = 70; // px the user must drag before refresh triggers
const MAX_PULL = 110; // visual ceiling for the indicator translation

export const PullToRefresh = () => {
  const queryClient = useQueryClient();
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const isAtTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
    const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || isDesktop() || !isAtTop()) return;
      if (e.touches.length !== 1) return;
      // Skip if the gesture starts inside a scrollable overlay (sheet/dialog)
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"], [data-radix-scroll-area-viewport], [data-no-ptr]')) {
        return;
      }
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current || startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Rubber-band so it never feels rigid
      const eased = Math.min(MAX_PULL, dy * 0.55);
      setPull(eased);
    };

    const onTouchEnd = async () => {
      if (!activeRef.current) return;
      const shouldRefresh = pull >= THRESHOLD;
      activeRef.current = false;
      startYRef.current = null;

      if (shouldRefresh) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await queryClient.invalidateQueries();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 400);
        }
      } else {
        setPull(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [queryClient, pull, refreshing]);

  if (pull <= 0 && !refreshing) return null;

  const opacity = Math.min(1, pull / THRESHOLD);
  const rotate = Math.min(180, (pull / THRESHOLD) * 180);

  return (
    <div
      aria-hidden={!refreshing}
      className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center"
      style={{
        transform: `translateY(${Math.max(0, pull - 40)}px)`,
        transition: refreshing ? "transform 200ms ease-out" : undefined,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur"
        style={{ opacity }}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${rotate}deg)`, transition: "transform 80ms linear" }}
          aria-hidden="true"
        />
        <span>{refreshing ? "Refreshing…" : pull >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
    </div>
  );
};