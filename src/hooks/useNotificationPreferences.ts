import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  // Email preferences
  task_notifications: boolean;
  meal_summaries: boolean;
  habit_reminders: boolean;
  household_invitations: boolean;
  weekly_digest: boolean;
  access_updates: boolean;
  // WhatsApp preferences
  task_notifications_whatsapp: boolean;
  daily_plan_whatsapp: boolean;
  pantry_alerts_whatsapp: boolean;
  habit_reminders_whatsapp: boolean;
  household_invitations_whatsapp: boolean;
  weekly_digest_whatsapp: boolean;
}

const defaultPreferences: NotificationPreferences = {
  task_notifications: true,
  meal_summaries: true,
  habit_reminders: true,
  household_invitations: true,
  weekly_digest: true,
  access_updates: true,
  task_notifications_whatsapp: false,
  daily_plan_whatsapp: false,
  pantry_alerts_whatsapp: false,
  habit_reminders_whatsapp: false,
  household_invitations_whatsapp: false,
  weekly_digest_whatsapp: false,
};

export function useNotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_email_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return { ...defaultPreferences, ...newData } as NotificationPreferences;
      }

      return { ...defaultPreferences, ...data } as NotificationPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_email_preferences")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  const togglePreference = (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    updatePreferences.mutate({ [key]: !preferences[key] });
  };

  return {
    preferences: preferences || defaultPreferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    togglePreference,
    isUpdating: updatePreferences.isPending,
  };
}
