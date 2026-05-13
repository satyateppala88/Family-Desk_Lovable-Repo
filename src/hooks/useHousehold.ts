import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useHousehold = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["household", user?.id],
    queryFn: async () => {
      if (!user) return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null };

      // Single join query instead of two sequential round-trips.
      // Order by household created_at DESC so users in multiple households
      // deterministically land in the most recently created one.
      // maybeSingle() returns null instead of throwing when no row exists.
      const { data: memberData, error: memberError } = await (supabase as any)
        .from("household_members")
        .select("household_id, households(onboarding_completed, name, avatar_url, created_at)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (memberError) throw memberError;

      const householdId = memberData?.household_id || null;
      if (!householdId) {
        return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null, householdCreatedAt: null };
      }

      const householdData = memberData?.households;
      return {
        householdId,
        onboardingCompleted: householdData?.onboarding_completed || false,
        householdName: householdData?.name || null,
        householdAvatarUrl: householdData?.avatar_url || null,
        householdCreatedAt: householdData?.created_at || null,
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
    householdCreatedAt: data?.householdCreatedAt || null,
    isLoading,
  };
};
