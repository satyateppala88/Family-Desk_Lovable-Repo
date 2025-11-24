import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useHousehold = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["household", user?.id],
    queryFn: async () => {
      if (!user) return { householdId: null, onboardingCompleted: false };

      const { data: memberData, error: memberError } = await (supabase as any)
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (memberError) throw memberError;
      
      const householdId = memberData?.household_id || null;
      
      if (!householdId) {
        return { householdId: null, onboardingCompleted: false };
      }

      // Fetch household onboarding status
      const { data: householdData } = await supabase
        .from("households")
        .select("onboarding_completed")
        .eq("id", householdId)
        .single();

      return {
        householdId,
        onboardingCompleted: householdData?.onboarding_completed || false,
      };
    },
    enabled: !!user,
  });

  return {
    householdId: data?.householdId || null,
    onboardingCompleted: data?.onboardingCompleted || false,
    isLoading,
  };
};
