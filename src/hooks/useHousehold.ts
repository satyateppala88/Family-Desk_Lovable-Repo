import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useHousehold = () => {
  const { user } = useAuth();

  const { data: householdId, isLoading } = useQuery({
    queryKey: ["household", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (error) throw error;
      return data?.household_id || null;
    },
    enabled: !!user,
  });

  return {
    householdId: householdId || null,
    isLoading,
  };
};
