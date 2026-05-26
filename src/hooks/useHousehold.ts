import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useHousehold = () => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["household", user?.id],
    queryFn: async () => {
      if (!user) return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null };

      try {
        // Fetch recent memberships and choose the best household client-side.
        // If a user has an abandoned/incomplete household plus a real one,
        // prefer the completed household so the dashboard does not open empty.
        const { data: memberData, error: memberError } = await supabase
          .from("household_members")
          .select("household_id, households(onboarding_completed, name, avatar_url, created_at)")
          .eq("user_id", user.id)
          .order("joined_at", { ascending: false })
          .limit(10);

        if (memberError) throw memberError;
        if (memberData == null) {
          return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null, householdCreatedAt: null };
        }

        const memberships = Array.isArray(memberData) ? memberData : [];
        const selectedMembership =
          memberships.find((m: any) => m?.households?.onboarding_completed) ||
          memberships[0];

        const householdId = selectedMembership?.household_id || null;
        if (!householdId) {
          return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null, householdCreatedAt: null };
        }

        const householdData = selectedMembership?.households;
        return {
          householdId,
          onboardingCompleted: householdData?.onboarding_completed || false,
          householdName: householdData?.name || null,
          householdAvatarUrl: householdData?.avatar_url || null,
          householdCreatedAt: householdData?.created_at || null,
        };
      } catch (e) {
        return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null, householdCreatedAt: null };
      }
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
    error,
    refetch,
  };
};
