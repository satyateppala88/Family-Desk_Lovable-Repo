import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { HouseholdPreferences } from "@/types/database";

export const useHouseholdPreferences = (householdId: string | null) => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["household-preferences", householdId],
    queryFn: async () => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from("household_preferences")
        .select("*")
        .eq("household_id", householdId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as HouseholdPreferences | null;
    },
    enabled: !!householdId,
    staleTime: 5 * 60 * 1000, // 5 minutes - preferences rarely change
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<HouseholdPreferences>) => {
      if (!householdId) throw new Error("No household ID");
      
      const { error } = await supabase
        .from("household_preferences")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("household_id", householdId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-preferences", householdId] });
      toast.success("Preferences updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update preferences: " + error.message);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutateAsync,
    isUpdating: updatePreferences.isPending,
  };
};
