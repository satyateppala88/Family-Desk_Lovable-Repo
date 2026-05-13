import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HouseholdMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

export const useHouseholdMembers = (householdId: string | null) => {
  return useQuery({
    queryKey: ["household-members", householdId],
    queryFn: async (): Promise<HouseholdMember[]> => {
      if (!householdId) return [];

      const { data: members, error: membersError } = await supabase
        .from("household_members")
        .select("user_id, role")
        .eq("household_id", householdId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return members.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          userId: m.user_id,
          displayName: profile?.display_name || "Member",
          avatarUrl: profile?.avatar_url || null,
          role: m.role,
        };
      });
    },
    enabled: !!householdId,
  });
};
