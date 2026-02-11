import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const usePendingInvitations = (householdId: string | undefined | null) => {
  return useQuery({
    queryKey: ["pending-invitations", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("household_invitations")
        .select("*")
        .eq("household_id", householdId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!householdId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

// Helper to get invitation type label
export const getInvitationTypeLabel = (type: string) => {
  switch (type) {
    case "admin_invite":
      return "Invited";
    case "join_request":
    default:
      return "Join Request";
  }
};
