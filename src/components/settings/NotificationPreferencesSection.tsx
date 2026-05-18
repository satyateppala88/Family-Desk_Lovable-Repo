import { useState, useEffect } from "react";
import { Bell, Mail, MessageCircle, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationType {
  id: string;
  label: string;
  description: string;
  emailKey: keyof typeof PREFERENCE_KEYS.email;
  whatsappKey: keyof typeof PREFERENCE_KEYS.whatsapp | null;
}

const PREFERENCE_KEYS = {
  email: {
    task_notifications: "task_notifications",
    meal_summaries: "meal_summaries",
    pantry_alerts: "pantry_alerts",
    habit_reminders: "habit_reminders",
    household_invitations: "household_invitations",
    weekly_digest: "weekly_digest",
  },
  whatsapp: {
    task_notifications_whatsapp: "task_notifications_whatsapp",
    daily_plan_whatsapp: "daily_plan_whatsapp",
    pantry_alerts_whatsapp: "pantry_alerts_whatsapp",
    habit_reminders_whatsapp: "habit_reminders_whatsapp",
    household_invitations_whatsapp: "household_invitations_whatsapp",
    weekly_digest_whatsapp: "weekly_digest_whatsapp",
  },
} as const;

const NOTIFICATION_TYPES: NotificationType[] = [
  {
    id: "tasks",
    label: "Task Assignments",
    description: "When tasks are assigned to you",
    emailKey: "task_notifications",
    whatsappKey: "task_notifications_whatsapp",
  },
  {
    id: "daily_plan",
    label: "Daily Plan Summary",
    description: "Morning AI-prioritized task plan",
    emailKey: "meal_summaries",
    whatsappKey: "daily_plan_whatsapp",
  },
  {
    id: "pantry",
    label: "Pantry Alerts",
    description: "Items expiring soon",
    emailKey: "pantry_alerts",
    whatsappKey: "pantry_alerts_whatsapp",
  },
  {
    id: "habits",
    label: "Habit Reminders",
    description: "Daily habit check-in reminders",
    emailKey: "habit_reminders",
    whatsappKey: "habit_reminders_whatsapp",
  },
  {
    id: "household",
    label: "Household Invitations",
    description: "Invites to join households",
    emailKey: "household_invitations",
    whatsappKey: "household_invitations_whatsapp",
  },
  {
    id: "digest",
    label: "Weekly Digest",
    description: "Weekly activity summary",
    emailKey: "weekly_digest",
    whatsappKey: "weekly_digest_whatsapp",
  },
];

export function NotificationPreferencesSection() {
  const { preferences, isLoading, togglePreference, isUpdating } = useNotificationPreferences();
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(true);
  const { user } = useAuth();
  const userId = user?.id;

  // Check phone verification status
  useEffect(() => {
    if (!userId) return;
    const checkPhoneVerification = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_verified")
          .eq("id", userId)
          .maybeSingle();

        setPhoneVerified(profile?.phone_verified || false);
      } catch (err) {
        console.error("Error checking phone verification:", err);
      } finally {
        setLoadingPhone(false);
      }
    };

    checkPhoneVerification();

    // Subscribe to this user's profile changes only — deterministic
    // channel name so HMR/remount cannot leave a zombie topic behind.
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.phone_verified !== undefined) {
            setPhoneVerified(payload.new.phone_verified);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (isLoading || loadingPhone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr,80px,80px] gap-4 pb-2 border-b">
              <div className="text-sm font-medium text-muted-foreground">
                Notification Type
              </div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-green-500" />
                <span>WhatsApp</span>
              </div>
            </div>

            {/* Notification Rows */}
            {NOTIFICATION_TYPES.map((type) => {
              const emailValue = preferences[type.emailKey] ?? true;
              const whatsappValue = type.whatsappKey 
                ? preferences[type.whatsappKey] ?? false 
                : false;
              const whatsappDisabled = !phoneVerified;

              return (
                <div
                  key={type.id}
                  className="grid grid-cols-[1fr,80px,80px] gap-4 py-3 items-center border-b last:border-0"
                >
                  <div>
                    <Label className="font-medium">{type.label}</Label>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>

                  {/* Email Toggle */}
                  <div className="flex justify-center">
                    <Switch
                      checked={emailValue}
                      onCheckedChange={() => togglePreference(type.emailKey)}
                      disabled={isUpdating}
                      aria-label={`${type.label} email notifications`}
                    />
                  </div>

                  {/* WhatsApp Toggle */}
                  <div className="flex justify-center">
                    {type.whatsappKey ? (
                      whatsappDisabled ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Switch
                                checked={false}
                                disabled
                                aria-label={`${type.label} WhatsApp notifications`}
                              />
                              <Info className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verify your phone number to enable WhatsApp notifications</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Switch
                          checked={whatsappValue}
                          onCheckedChange={() => type.whatsappKey && togglePreference(type.whatsappKey)}
                          disabled={isUpdating}
                          aria-label={`${type.label} WhatsApp notifications`}
                        />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        {!phoneVerified && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Verify your phone number above to enable WhatsApp notifications
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
