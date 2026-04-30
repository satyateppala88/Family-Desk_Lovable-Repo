import { useEffect, useState, useCallback } from "react";

const LAST_ONLINE_KEY = "familydesk:last-online-at";

function readLastOnline(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(LAST_ONLINE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : Date.now();
}

function writeLastOnline(ts: number): void {
  try {
    window.localStorage.setItem(LAST_ONLINE_KEY, String(ts));
  } catch {
    /* private mode / quota — ignore */
  }
}

/**
 * Tracks the device's online/offline status, plus the last timestamp the
 * device was confirmed online. The timestamp persists across reloads so
 * the offline banner can say "data from 12 minutes ago" even after a cold
 * start while still offline.
 */
export function useOnlineStatus(): {
  isOnline: boolean;
  lastOnlineAt: number;
} {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<number>(() => {
    const initialOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    if (initialOnline) {
      const now = Date.now();
      writeLastOnline(now);
      return now;
    }
    return readLastOnline();
  });

  const handleOnline = useCallback(() => {
    const now = Date.now();
    writeLastOnline(now);
    setLastOnlineAt(now);
    setIsOnline(true);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, lastOnlineAt };
}