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
  });
};
