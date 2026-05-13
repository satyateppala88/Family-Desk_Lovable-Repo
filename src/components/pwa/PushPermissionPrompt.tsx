import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "push_prompt_dismissed_at";
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIpad =
    /Macintosh/.test(ua) &&
    typeof document !== "undefined" &&
    "ontouchend" in document;
  return /iPad|iPhone|iPod/.test(ua) || isIpad;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

function wasRecentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    if (!ts) return false;
    return Date.now() - ts < FOURTEEN_DAYS_MS;
  } catch {
    return false;
  }
}

export const PushPermissionPrompt = () => {
  const { user } = useAuth();
  const { isSupported, permission, subscribe } = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    if (permission !== "default") return;
    if (!user) return;

    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt < THREE_DAYS_MS) return;

    const eligible = isAndroid() || (isIosDevice() && isStandalone());
    if (!eligible) return;

    if (wasRecentlyDismissed()) return;

    // Slight delay so we don't bombard right at app open.
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [isSupported, permission, user]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await subscribe();
      if (ok) {
        toast.success("Notifications enabled ✓");
        setOpen(false);
      } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setDenied(true);
      } else {
        // Could be no VAPID key, no SW, etc. — soft dismiss.
        toast.error("Couldn't enable notifications. Please try again later.");
        dismiss();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <BottomSheet
      isOpen={open}
      onClose={dismiss}
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden>🔔</span> Stay on top of family tasks
        </span>
      }
      description="Get reminders for habits, upcoming tasks, and low grocery items. We'll never spam you."
      footer={
        denied ? (
          <Button className="w-full" variant="outline" onClick={dismiss}>
            Close
          </Button>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <Button className="w-full" onClick={handleEnable} disabled={busy}>
              {busy ? "Asking…" : "Enable notifications"}
            </Button>
            <Button className="w-full" variant="ghost" onClick={dismiss} disabled={busy}>
              Maybe later
            </Button>
          </div>
        )
      }
    >
      {denied && (
        <div className="rounded-lg bg-[#F1EFE8] p-3 text-[13px] text-[#6B6965]">
          {isIosDevice()
            ? "Enable notifications later in your phone Settings → Safari → FamilyDesk."
            : "Enable notifications later in your phone Settings → Apps → FamilyDesk."}
        </div>
      )}
    </BottomSheet>
  );
};

export default PushPermissionPrompt;