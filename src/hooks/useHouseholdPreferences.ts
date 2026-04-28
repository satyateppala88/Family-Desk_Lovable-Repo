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

      const cachedPreferences =
        queryClient.getQueryData<HouseholdPreferences | null>(["household-preferences", householdId]) ??
        preferences;
      const payload = {
        ...(cachedPreferences ?? {}),
        ...updates,
        household_id: householdId,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error: updateError } = await supabase
        .from("household_preferences")
        .update(payload)
        .eq("household_id", householdId)
        .select("*")
        .maybeSingle();

      if (updateError) throw updateError;
      if (updated) return updated as HouseholdPreferences;

      const { data: inserted, error: insertError } = await supabase
        .from("household_preferences")
        .insert(payload)
        .select("*")
        .single();

      if (insertError) throw insertError;
      return inserted as HouseholdPreferences;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["household-preferences", householdId] });
      const previous = queryClient.getQueryData<HouseholdPreferences | null>([
        "household-preferences",
        householdId,
      ]);

      if (householdId) {
        queryClient.setQueryData<HouseholdPreferences | null>(["household-preferences", householdId], (current) =>
          current
            ? { ...current, ...updates, updated_at: new Date().toISOString() }
            : ({ ...updates, household_id: householdId, updated_at: new Date().toISOString() } as HouseholdPreferences),
        );
      }

      return { previous };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["household-preferences", householdId], saved);
      queryClient.invalidateQueries({ queryKey: ["household-preferences", householdId] });
      toast.success("Preferences updated!");
    },
    onError: (error: any, _updates, context) => {
      queryClient.setQueryData(["household-preferences", householdId], context?.previous ?? null);
      toast.error("Failed to update preferences: " + error.message);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: async (updates: Partial<HouseholdPreferences>) => {
      await updatePreferences.mutateAsync(updates);
    },
    isUpdating: updatePreferences.isPending,
  };
};
