import { useEffect, useState, useCallback } from "react";
import { Bell, Camera, ImageIcon, Mic, ShieldCheck, ExternalLink, RefreshCw, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  clearSuppression,
  isSuppressed,
  type PermissionKind,
  type PermissionState,
  queryPermission,
} from "@/lib/permissions";
import { usePermissionPrimer } from "@/hooks/usePermissionPrimer";
import { PermissionPrimerDialog } from "@/components/permissions/PermissionPrimerDialog";

type Row = {
  kind: PermissionKind;
  Icon: typeof Mic;
  title: string;
  description: string;
  usedFor: string;
};

const ROWS: Row[] = [
  {
    kind: "microphone",
    Icon: Mic,
    title: "Microphone",
    description: "Speak instead of type — voice input for tasks, grocery items, and the AI assistant.",
    usedFor: "Voice input is converted to text on this device. Audio is never recorded or uploaded.",
  },
  {
    kind: "camera",
    Icon: Camera,
    title: "Camera",
    description: "Take a profile photo for yourself, your household, or a family member.",
    usedFor: "Photos are saved only when you tap Upload, and stored privately for your household.",
  },
  {
    kind: "photos",
    Icon: ImageIcon,
    title: "Photo library",
    description: "Pick an existing picture for a profile or household avatar.",
    usedFor: "We only see the single image you select — never your full library.",
  },
  {
    kind: "notifications",
    Icon: Bell,
    title: "Notifications",
    description: "Gentle reminders for tasks, habits, meal prep, and pantry alerts.",
    usedFor: "No marketing — only your reminders. Quiet hours respected (8 AM – 9 PM IST).",
  },
];

const isNative = (): boolean =>
  typeof window !== "undefined" &&
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();

const openOSSettings = async () => {
  // On native, open the app's system settings page directly.
  if (isNative()) {
    try {
      // Resolved at runtime only on native builds where @capacitor/app is bundled.
      // The string indirection prevents TS/Vite from requiring the module at build time.
      const moduleName = "@capacitor/app";
      const mod: unknown = await import(/* @vite-ignore */ moduleName);
      const App = (mod as { App?: { openSettings?: () => Promise<void> } }).App;
      if (App?.openSettings) {
        await App.openSettings();
        return;
      }
    } catch (err) {
      console.warn("[permissions] failed to open native settings:", err);
    }
    toast.info("Open your device's Settings app, find Family Desk, and adjust permissions there.");
    return;
  }

  // Web: there is no programmatic way to open browser site settings.
  // Show clear, browser-aware guidance instead.
  const ua = navigator.userAgent.toLowerCase();
  let hint = "Open your browser's site settings to change permissions for Family Desk.";
  if (ua.includes("chrome") || ua.includes("edg")) {
    hint = "Tap the lock icon (🔒) next to the address bar → Site settings to change permissions.";
  } else if (ua.includes("firefox")) {
    hint = "Tap the lock icon (🔒) next to the address bar → Connection secure → More information → Permissions.";
  } else if (ua.includes("safari")) {
    hint = "Open Safari → Settings → Websites to change permissions for Family Desk.";
  }
  toast.info(hint, { duration: 7000 });
};

const STATE_META: Record<PermissionState, { label: string; tone: string }> = {
  granted: { label: "Allowed", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
  denied: { label: "Blocked", tone: "bg-destructive/10 text-destructive border-destructive/20" },
  prompt: { label: "Not asked", tone: "bg-muted text-muted-foreground border-border" },
  unsupported: { label: "Unavailable", tone: "bg-muted text-muted-foreground border-border" },
};

const PermissionsSettings = () => {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<PermissionKind, PermissionState>>({
    microphone: "prompt",
    camera: "prompt",
    photos: "prompt",
    notifications: "prompt",
  });
  const [suppressed, setSuppressedMap] = useState<Record<PermissionKind, boolean>>({
    microphone: false,
    camera: false,
    photos: false,
    notifications: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { ensurePermission, primerProps } = usePermissionPrimer();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const entries = await Promise.all(
      ROWS.map(async (r) => [r.kind, await queryPermission(r.kind)] as const)
    );
    setStatuses(Object.fromEntries(entries) as Record<PermissionKind, PermissionState>);
    setSuppressedMap({
      microphone: isSuppressed("microphone"),
      camera: isSuppressed("camera"),
      photos: isSuppressed("photos"),
      notifications: isSuppressed("notifications"),
    });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
    // Re-check when the tab regains focus (user may have changed OS settings).
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const handleRequest = async (kind: PermissionKind) => {
    if (suppressed[kind]) {
      clearSuppression(kind);
      setSuppressedMap((m) => ({ ...m, [kind]: false }));
    }
    const granted = await ensurePermission(kind);
    await refresh();
    if (granted) toast.success("Permission enabled");
  };

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                aria-label="Back to settings"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="page-heading flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Permissions
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  See what Family Desk can access and change your mind anytime.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open device settings</CardTitle>
              <CardDescription>
                If a permission is blocked, you'll need to re-enable it from your {isNative() ? "device" : "browser"} settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={openOSSettings} className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open {isNative() ? "device" : "browser"} settings
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {ROWS.map(({ kind, Icon, title, description, usedFor }) => {
              const state = statuses[kind];
              const meta = STATE_META[state];
              const isBlocked = state === "denied";
              const isGranted = state === "granted";
              const isUnsupported = state === "unsupported";
              const wasSuppressed = suppressed[kind];

              return (
                <Card key={kind}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 text-primary p-2.5 shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground">{title}</h3>
                          <Badge variant="outline" className={meta.tone}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {usedFor}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {isUnsupported ? (
                            <span className="text-xs text-muted-foreground">
                              Not available on this device.
                            </span>
                          ) : isGranted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openOSSettings}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Manage in {isNative() ? "device" : "browser"} settings
                            </Button>
                          ) : isBlocked ? (
                            <Button
                              size="sm"
                              onClick={openOSSettings}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Re-enable in settings
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleRequest(kind)}
                            >
                              {wasSuppressed ? "Ask me again" : "Enable"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2 pb-6">
            Family Desk only requests these when you use a related feature. See our{" "}
            <button
              onClick={() => navigate("/privacy")}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </button>{" "}
            for full details.
          </p>
        </div>
      </main>

      <PermissionPrimerDialog {...primerProps} />
    </>
  );
};

export default PermissionsSettings;