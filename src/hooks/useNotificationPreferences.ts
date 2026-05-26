import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { STALE } from "@/lib/query-constants";

export type NotificationChannel =
  | "tasks"
  | "habits"
  | "meals"
  | "pantry"
  | "invites"
  | "daily_plan"
  | "finance"
  | "calendar"
  | "ai_suggestions"
  | "pantry_daily_reminder";

export interface NotificationPreferences {
  user_id: string;
  tasks: boolean;
  habits: boolean;
  meals: boolean;
  pantry: boolean;
  invites: boolean;
  daily_plan: boolean;
  finance: boolean;
  calendar: boolean;
  ai_suggestions: boolean;
  pantry_daily_reminder: boolean;
  updated_at: string;
}

const DEFAULTS: Omit<NotificationPreferences, "user_id" | "updated_at"> = {
  tasks: true,
  habits: true,
  meals: true,
  pantry: true,
  invites: true,
  daily_plan: true,
  finance: true,
  calendar: true,
  ai_suggestions: true,
  pantry_daily_reminder: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["notification-preferences", userId],
    enabled: !!userId,
    staleTime: STALE.LONG,
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      // Row is auto-created by the handle_new_user trigger, but fall back
      // gracefully if it's missing (e.g. legacy accounts).
      if (!data) {
        return {
          user_id: userId,
          ...DEFAULTS,
          updated_at: new Date().toISOString(),
        };
      }
      return data as NotificationPreferences;
    },
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<Record<NotificationChannel, boolean>>) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userId, ...DEFAULTS, ...query.data, ...patch },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      return patch;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({
        queryKey: ["notification-preferences", userId],
      });
      const previous = queryClient.getQueryData<NotificationPreferences | null>([
        "notification-preferences",
        userId,
      ]);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(
          ["notification-preferences", userId],
          { ...previous, ...patch }
        );
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["notification-preferences", userId],
          ctx.previous
        );
      }
      toast.error("Couldn't save your preference. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notification-preferences", userId],
      });
    },
  });

  return {
    preferences: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    setChannel: (channel: NotificationChannel, enabled: boolean) =>
      mutation.mutate({ [channel]: enabled }),
    /**
     * Back-compat shim for legacy callers that pass arbitrary string keys.
     * Only keys present on `NotificationPreferences` actually persist; others
     * are accepted (no-op) so older UI can compile while we migrate it.
     */
    togglePreference: (key: string) => {
      const valid: NotificationChannel[] = [
        "tasks",
        "habits",
        "meals",
        "pantry",
        "invites",
        "daily_plan",
        "finance",
        "calendar",
        "ai_suggestions",
        "pantry_daily_reminder",
      ];
      if ((valid as string[]).includes(key)) {
        const channel = key as NotificationChannel;
        const current = query.data?.[channel] ?? true;
        mutation.mutate({ [channel]: !current });
      }
    },
    isUpdating: mutation.isPending,
  };
}