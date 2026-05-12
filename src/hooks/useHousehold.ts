import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const useHousehold = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["household", user?.id],
    queryFn: async () => {
      if (!user) return { householdId: null, onboardingCompleted: false, householdName: null, householdAvatarUrl: null };

      // Fetch ALL memberships, deterministically ordered by the household's
      // created_at DESC so the most recently created household wins. This
      // prevents users who happen to belong to multiple households from
      // landing in a stale/empty one (Postgres returns rows in arbitrary
      // order without an ORDER BY).
      const { data: memberRows, error: memberError } = await (supabase as any)
        .from("household_members")
        .select("household_id, households!inner(id, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { foreignTable: "households", ascending: false });

      if (memberError) throw memberError;

      if (import.meta.env.DEV && memberRows && memberRows.length > 1) {
        console.warn(
          `[useHousehold] User ${user.id} belongs to ${memberRows.length} households. Picking most recent:`,
          memberRows.map((r: any) => r.household_id)
        );
      }

      const householdId = memberRows?.[0]?.household_id || null;
      
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
