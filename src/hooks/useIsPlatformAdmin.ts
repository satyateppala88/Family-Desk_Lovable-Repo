import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useIsPlatformAdmin = () => {
  const { user } = useAuth();

  const { data: isPlatformAdmin = false, isLoading } = useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return { isPlatformAdmin, isLoading };
};
