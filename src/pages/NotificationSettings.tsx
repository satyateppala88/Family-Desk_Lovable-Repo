import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Lightbulb,
  ListChecks,
  Mail,
  ShieldAlert,
  ShoppingBasket,
  Sparkles,
  Sunrise,
  Target,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useNotificationPreferences,
  type NotificationChannel,
} from "@/hooks/useNotificationPreferences";
import {
  isIosNeedsInstall,
  requestNativePermission,
  type PermissionState,
} from "@/lib/notification-permission";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import {
  ensurePushSubscription,
  removePushSubscription,
} from "@/lib/push-subscription";

interface ChannelConfig {
  key: NotificationChannel;
  title: string;
  description: string;
  icon: typeof Bell;
}

const CHANNELS: ChannelConfig[] = [
  {
    key: "tasks",
    title: "Task reminders",
    description: "Get nudges for tasks due today and overdue items.",
    icon: ListChecks,
  },
  {
    key: "daily_plan",
    title: "Daily plan",
    description: "Your personalised morning plan summary.",
    icon: Sunrise,
  },
  {
    key: "habits",
    title: "Habit check-ins",
    description: "Reminders to log habits and celebrate streaks.",
    icon: Target,
  },
  {
    key: "meals",
    title: "Meal planning",
    description: "Today's meal plan and prep-ahead suggestions.",
    icon: ChefHat,
  },
  {
    key: "pantry",
    title: "Pantry & groceries",
    description: "Low-stock alerts and grocery list updates.",
    icon: ShoppingBasket,
  },
  {
    key: "invites",
    title: "Household invites",
    description: "When someone invites you or joins your household.",
    icon: Mail,
  },
  {
    key: "finance",
    title: "Finance",
    description: "Budget alerts, savings milestones, bill renewals.",
    icon: Wallet,
  },
  {
    key: "calendar",
    title: "Calendar",
    description: "Reminders before upcoming events.",
    icon: CalendarDays,
  },
  {
    key: "ai_suggestions",
    title: "AI suggestions",
    description: "When the AI assistant has a new tip for your household.",
    icon: Lightbulb,
  },
];

function permissionLabel(state: PermissionState) {
  switch (state) {
    case "granted":
      return { text: "Allowed", tone: "ok" as const, icon: CheckCircle2 };
    case "denied":
      return { text: "Blocked", tone: "bad" as const, icon: BellOff };
    case "default":
      return { text: "Not set", tone: "warn" as const, icon: Bell };
    case "unsupported":
    default:
      return {
        text: "Not supported on this device",
        tone: "warn" as const,
        icon: ShieldAlert,
      };
  }
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { preferences, isLoading, setChannel, isUpdating } =
    useNotificationPreferences();

  const permission = useNotificationPermission();
  const [requesting, setRequesting] = useState(false);
  const iosNeedsInstall = isIosNeedsInstall();

  const handleRequestPermission = async () => {
    setRequesting(true);
    const result = await requestNativePermission();
    if (result === "granted") {
      const sub = await ensurePushSubscription();
      setRequesting(false);
      if (sub.ok) {
        toast.success("Notifications enabled — you're all set.");
      } else {
        toast(
          "Permission granted, but we couldn't register this device for push. We'll retry next time you open the app."
        );
        console.warn("[push] subscription setup failed:", (sub as { reason: string }).reason);
      }
    } else if (result === "denied") {
      setRequesting(false);
      toast.error(
        "Notifications are blocked. You can re-enable them in your browser's site settings."
      );
    } else {
      setRequesting(false);
    }
  };

  // If the user already granted permission previously but never registered a
  // subscription on this device (e.g. cleared site data, new browser), quietly
  // try to register it now.
  useEffect(() => {
    if (permission !== "granted") return;
    let cancelled = false;
    (async () => {
      const result = await ensurePushSubscription();
      if (cancelled) return;
      if (!result.ok) {
        const reason = (result as { reason: string }).reason;
        if (reason !== "no-service-worker") {
          console.warn("[push] background subscription setup failed:", reason);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permission]);

  const permInfo = permissionLabel(permission);
  const PermIcon = permInfo.icon;
  const channelsDisabled = permission !== "granted";

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="page-heading">Notifications</h1>
          </div>

          {/* Permission status */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Browser permission
                    <Badge
                      variant={
                        permInfo.tone === "ok"
                          ? "default"
                          : permInfo.tone === "bad"
                            ? "destructive"
                            : "secondary"
                      }
                      className="gap-1"
                    >
                      <PermIcon className="h-3 w-3" />
                      {permInfo.text}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Required by your browser before FamilyDesk can send any
                    push notifications.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {permission === "default" && !iosNeedsInstall && (
                <Button onClick={handleRequestPermission} disabled={requesting}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {requesting ? "Asking…" : "Enable notifications"}
                </Button>
              )}

              {permission === "denied" && (
                <p className="text-sm text-muted-foreground">
                  Notifications were blocked. Open your browser's site settings
                  for FamilyDesk and switch notifications to <strong>Allow</strong>,
                  then return here.
                </p>
              )}

              {iosNeedsInstall && permission !== "granted" && (
                <p className="text-sm text-muted-foreground">
                  On iPhone/iPad, FamilyDesk needs to be added to your Home
                  Screen first. Tap the Share icon in Safari, choose{" "}
                  <strong>Add to Home Screen</strong>, then open the app from
                  there to enable notifications.
                </p>
              )}

              {permission === "unsupported" && (
                <p className="text-sm text-muted-foreground">
                  This browser doesn't support web notifications. You can still
                  manage preferences below — they'll apply when you sign in
                  somewhere notifications are supported.
                </p>
              )}

              {permission === "granted" && (
                <p className="text-sm text-muted-foreground">
                  You're all set. Use the toggles below to choose which kinds of
                  reminders you want to receive.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Channel toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Reminder types</CardTitle>
              <CardDescription>
                Turn individual categories on or off. Changes save automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {isLoading || !preferences ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                CHANNELS.map((c) => {
                  const Icon = c.icon;
                  const checked = Boolean(preferences[c.key]);
                  return (
                    <div
                      key={c.key}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`notif-${c.key}`}
                          className="text-sm font-medium leading-tight cursor-pointer"
                        >
                          {c.title}
                        </label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.description}
                        </p>
                      </div>
                      <Switch
                        id={`notif-${c.key}`}
                        checked={checked}
                        disabled={isUpdating || channelsDisabled}
                        onCheckedChange={(v) => setChannel(c.key, v)}
                        aria-label={`Toggle ${c.title}`}
                      />
                    </div>
                  );
                })
              )}

              {channelsDisabled && !isLoading && (
                <p className="pt-3 text-xs text-muted-foreground">
                  Toggles are disabled until browser permission is granted.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => navigate("/settings")}>
              Back to settings
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}