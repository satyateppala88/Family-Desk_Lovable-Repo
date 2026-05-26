import { useEffect, useState } from "react";
import { Share, Plus, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import iconUrl from "@/assets/familydesk-icon.png";

const DISMISS_KEY = "ios_install_dismissed_at";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh — check touch support too.
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
    return Date.now() - ts < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

export const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!isIosDevice()) return;
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed left-3 right-3 bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] z-40 flex items-center gap-3 rounded-2xl border border-[#E5E3DC] bg-white p-3 shadow-lg lg:hidden text-left"
        aria-label="Install FamilyDesk to your Home Screen for notifications"
      >
        <img
          src={iconUrl}
          alt=""
          className="h-8 w-8 rounded-lg shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#2C2C2A] leading-tight">
            Install app for notifications
          </div>
          <div className="text-[13px] text-[#888780] leading-tight mt-0.5">
            Tap Share → Add to Home Screen
          </div>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={dismiss}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              dismiss(e as unknown as React.MouseEvent);
            }
          }}
          className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-[#888780] hover:bg-[#F1EFE8]"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </span>
      </button>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Install FamilyDesk"
        description="Add it to your Home Screen to enable notifications and a full-screen experience."
        footer={
          <Button
            className="w-full"
            onClick={() => setSheetOpen(false)}
          >
            Got it
          </Button>
        }
      >
        <div className="space-y-4 py-2">
          <Step
            n={1}
            title="Tap the Share button"
            body="In Safari's bottom toolbar."
            icon={<Share className="h-5 w-5" />}
          />
          <Step
            n={2}
            title='Scroll and tap "Add to Home Screen"'
            body="It's in the action list under the share sheet."
            icon={<Plus className="h-5 w-5" />}
          />
          <Step
            n={3}
            title='Tap "Add" in the top right'
            body="FamilyDesk will appear on your Home Screen like a native app."
            icon={<span className="text-sm font-semibold">Add</span>}
          />
        </div>
      </BottomSheet>
    </>
  );
};

const Step = ({
  n,
  title,
  body,
  icon,
}: {
  n: number;
  title: string;
  body: string;
  icon: React.ReactNode;
}) => (
  <div className="flex gap-3">
    <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
      {n}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-[#2C2C2A]">
        {title}
        <span className="text-[#888780]">{icon}</span>
      </div>
      <p className="text-[13px] text-[#6B6965] mt-0.5">{body}</p>
    </div>
  </div>
);

export default IOSInstallBanner;