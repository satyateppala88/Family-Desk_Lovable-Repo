import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const useIsHouseholdAdmin = (householdId: string | undefined | null) => {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ["is-household-admin", householdId, user?.id],
    queryFn: async () => {
      if (!user || !householdId) return false;

      const { data } = await supabase
        .from("household_members")
        .select("role")
        .eq("household_id", householdId)
        .eq("user_id", user.id)
        .maybeSingle();

      return data?.role === "admin";
    },
    enabled: !!user && !!householdId,
    staleTime: 10 * 60 * 1000,
  });

  return { isAdmin, isLoading };
};
