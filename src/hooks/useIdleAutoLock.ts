import { useEffect, useRef } from "react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { clearUnlock, getIdleTimeoutMs, isPinEnabled } from "@/lib/financePin";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const IDLE_EVENTS = ["mousedown", "touchstart", "keydown", "scroll"] as const;

export const useIdleAutoLock = () => {
  const { setPrivacy, isPrivate } = usePrivacyMode();
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPrivateRef = useRef(isPrivate);
  const pathRef = useRef(location.pathname);

  useEffect(() => { isPrivateRef.current = isPrivate; }, [isPrivate]);
  useEffect(() => { pathRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const fire = () => {
      if (cancelled) return;
      setPrivacy(true);
      if (isPinEnabled()) {
        clearUnlock();
        window.dispatchEvent(new CustomEvent("familydesk:finance-locked"));
      }
      toast("Screen locked due to inactivity", { duration: 3000 });
    };

    const schedule = () => {
      clearTimer();
      const ms = getIdleTimeoutMs();
      if (ms === null) return; // "never"
      timerRef.current = setTimeout(fire, ms);
    };

    const onActivity = () => {
      // Don't constantly reschedule when already in private+locked state — but still
      // reset so the next interaction extends the window once user unlocks.
      schedule();
    };

    const onTimeoutChange = () => schedule();

    IDLE_EVENTS.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener("familydesk:idle-timeout-changed", onTimeoutChange);
    schedule();

    return () => {
      cancelled = true;
      clearTimer();
      IDLE_EVENTS.forEach((e) => document.removeEventListener(e, onActivity));
      window.removeEventListener("familydesk:idle-timeout-changed", onTimeoutChange);
    };
  }, [setPrivacy]);
};