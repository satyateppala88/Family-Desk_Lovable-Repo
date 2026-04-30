import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useHousehold = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["household", user?.id],
    queryFn: async () => {
      if (!user) return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null };

      const { data: memberData, error: memberError } = await (supabase as any)
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (memberError) throw memberError;
      
      const householdId = memberData?.household_id || null;
      
      if (!householdId) {
        return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null };
      }

      // Fetch household onboarding status and name
      const { data: householdData } = await supabase
        .from("households")
        .select("onboarding_completed, name, avatar_url")
        .eq("id", householdId)
        .single();

      return {
        householdId,
        onboardingCompleted: householdData?.onboarding_completed || false,
        householdName: householdData?.name || null,
        householdAvatarUrl: (householdData as any)?.avatar_url || null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    householdId: data?.householdId || null,
    onboardingCompleted: data?.onboardingCompleted || false,
    householdName: data?.householdName || null,
    householdAvatarUrl: data?.householdAvatarUrl || null,
    isLoading,
  };
};
