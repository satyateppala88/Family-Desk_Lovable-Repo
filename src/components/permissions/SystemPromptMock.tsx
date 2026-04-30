import { useEffect, useState } from "react";
import type { PermissionKind } from "@/lib/permissions";

export type MobilePlatform = "ios" | "android";

export const detectMobilePlatform = (): MobilePlatform => {
  if (typeof window === "undefined") return "ios";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor?.getPlatform?.();
  if (cap === "ios") return "ios";
  if (cap === "android") return "android";
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "android";
};

type Copy = {
  iosTitle: string;
  iosBody: string;
  androidTitle: string;
  androidBody?: string;
  /** true → 3-button "While using / Only this time / Don't allow" Android sheet (runtime) */
  androidRuntime?: boolean;
};

const COPY: Record<PermissionKind, Copy> = {
  microphone: {
    iosTitle: '"Family Desk" Would Like to Access the Microphone',
    iosBody:
      "Used to dictate tasks, grocery items, and chats. Audio is processed on this device and never uploaded.",
    androidTitle: "Allow Family Desk to record audio?",
    androidRuntime: true,
  },
  camera: {
    iosTitle: '"Family Desk" Would Like to Access the Camera',
    iosBody:
      "Used to take a profile or household photo. Photos are saved only when you tap Upload.",
    androidTitle: "Allow Family Desk to take pictures and record video?",
    androidRuntime: true,
  },
  photos: {
    iosTitle: '"Family Desk" Would Like to Access Your Photos',
    iosBody:
      "Used to pick a profile or household avatar. We only see the photos you select.",
    androidTitle: "Allow Family Desk to access photos and media?",
    androidRuntime: true,
  },
  notifications: {
    iosTitle: '"Family Desk" Would Like to Send You Notifications',
    iosBody:
      "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.",
    androidTitle: "Allow Family Desk to send you notifications?",
    androidRuntime: true,
  },
};

interface Props {
  kind: PermissionKind;
  platform: MobilePlatform;
}

/**
 * Stylized, App-Store-safe mockup of the system permission prompt.
 * Not a real screenshot — uses neutral typography and no Apple/Google
 * trademarks, per platform review guidelines.
 */
export const SystemPromptMock = ({ kind, platform }: Props) => {
  const copy = COPY[kind];
  // Re-trigger entrance animation when platform/kind changes.
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [kind, platform]);

  return (
    <div className="rounded-2xl bg-gradient-to-b from-muted/60 to-muted/20 border border-border/60 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 text-center mb-2">
        {platform === "ios" ? "iOS preview" : "Android preview"}
      </div>

      <div className="flex justify-center" key={animKey}>
        {platform === "ios" ? (
          <IosAlert title={copy.iosTitle} body={copy.iosBody} />
        ) : (
          <AndroidDialog
            title={copy.androidTitle}
            body={copy.androidBody}
            runtime={copy.androidRuntime}
          />
        )}
      </div>
    </div>
  );
};

/* ---------- iOS ---------- */

const IosAlert = ({ title, body }: { title: string; body: string }) => (
  <div
    className="w-[260px] rounded-[14px] bg-white/95 dark:bg-zinc-100/95 text-zinc-900 shadow-xl backdrop-blur-md animate-scale-in"
    style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
  >
    <div className="px-4 pt-4 pb-3 text-center">
      <p className="text-[13px] font-semibold leading-snug">{title}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-600">{body}</p>
    </div>
    <div className="border-t border-zinc-300/70 grid grid-cols-2">
      <button
        type="button"
        className="py-2.5 text-[14px] text-[#007AFF] border-r border-zinc-300/70"
        tabIndex={-1}
      >
        Don't Allow
      </button>
      <button
        type="button"
        className="py-2.5 text-[14px] font-semibold text-[#007AFF]"
        tabIndex={-1}
      >
        OK
      </button>
    </div>
  </div>
);

/* ---------- Android ---------- */

const AndroidDialog = ({
  title,
  body,
  runtime,
}: {
  title: string;
  body?: string;
  runtime?: boolean;
}) => (
  <div
    className="w-[268px] rounded-[28px] bg-white dark:bg-zinc-100 text-zinc-900 shadow-xl animate-scale-in overflow-hidden"
    style={{ fontFamily: "Roboto, system-ui, sans-serif" }}
  >
    <div className="px-5 pt-5 pb-4">
      <p className="text-[15px] font-medium leading-snug">{title}</p>
      {body && <p className="mt-2 text-[12px] leading-snug text-zinc-600">{body}</p>}
    </div>
    <div className="px-2 pb-2 flex flex-col">
      {runtime ? (
        <>
          <AndroidBtn>While using the app</AndroidBtn>
          <AndroidBtn>Only this time</AndroidBtn>
          <AndroidBtn>Don't allow</AndroidBtn>
        </>
      ) : (
        <>
          <AndroidBtn>Allow</AndroidBtn>
          <AndroidBtn>Deny</AndroidBtn>
        </>
      )}
    </div>
  </div>
);

const AndroidBtn = ({ children }: { children: React.ReactNode }) => (
  <button
    type="button"
    className="text-left px-4 py-2.5 text-[13px] font-medium text-[#0B57D0] rounded-full hover:bg-[#0B57D0]/5"
    tabIndex={-1}
  >
    {children}
  </button>
);
