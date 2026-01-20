import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "./useHousehold";
import { toast } from "sonner";

export interface CalendarConnection {
  id: string;
  user_id: string;
  household_id: string;
  google_account_email: string;
  display_name: string;
  color: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export const useCalendarConnections = () => {
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ["calendar-connections", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("calendar_connections")
        .select("id, user_id, household_id, google_account_email, display_name, color, is_visible, created_at, updated_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CalendarConnection[];
    },
    enabled: !!householdId,
  });

  const initiateOAuth = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error("No household");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Use the current window location as the redirect URI
      const redirectUri = `${window.location.origin}/calendar`;

      const response = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "init", redirectUri, householdId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    },
    onError: (error) => {
      console.error("OAuth error:", error);
      toast.error("Failed to start Google authorization");
    },
  });

  const handleOAuthCallback = useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const redirectUri = `${window.location.origin}/calendar`;

      const response = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "callback", code, state, redirectUri },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Calendar connected successfully!");
    },
    onError: (error) => {
      console.error("Callback error:", error);
      toast.error("Failed to connect calendar");
    },
  });

  const disconnectCalendar = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "disconnect", connectionId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Calendar disconnected");
    },
    onError: () => {
      toast.error("Failed to disconnect calendar");
    },
  });

  const updateConnection = useMutation({
    mutationFn: async ({
      connectionId,
      displayName,
      color,
      isVisible,
    }: {
      connectionId: string;
      displayName?: string;
      color?: string;
      isVisible?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "update", connectionId, displayName, color, isVisible },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: () => {
      toast.error("Failed to update calendar settings");
    },
  });

  return {
    connections: connectionsQuery.data || [],
    isLoading: connectionsQuery.isLoading,
    error: connectionsQuery.error,
    initiateOAuth,
    handleOAuthCallback,
    disconnectCalendar,
    updateConnection,
  };
};
