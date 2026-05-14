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
    mutationFn: async (input: Partial<HouseholdPreferences> & { __silent?: boolean }) => {
      const { __silent: _silent, ...updates } = input as Partial<HouseholdPreferences> & { __silent?: boolean };
      // Silent no-op when called during the no-household race window
      // (e.g. auto-backfills firing before the household query resolves).
      if (!householdId) return null as unknown as HouseholdPreferences;

      // Send ONLY the fields the caller wants to change, plus the keys needed
      // for upsert. Never spread cached/optimistic data — that can include
      // server-managed fields (id, created_at) or partial optimistic shapes
      // that confuse PostgREST and cause 400s.
      const { id: _ignoreId, created_at: _ignoreCreated, updated_at: _ignoreUpdated, ...cleanUpdates } =
        (updates as Partial<HouseholdPreferences> & { id?: string; created_at?: string; updated_at?: string });

      const payload = {
        ...cleanUpdates,
        household_id: householdId,
        updated_at: new Date().toISOString(),
      };

      const { data: upserted, error: upsertError } = await supabase
        .from("household_preferences")
        .upsert(payload, { onConflict: "household_id" })
        .select("*")
        .single();

      if (upsertError) throw upsertError;
      return upserted as HouseholdPreferences;
    },
    onMutate: async (input) => {
      const { __silent: _s, ...updates } = (input ?? {}) as Partial<HouseholdPreferences> & { __silent?: boolean };
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
    onSuccess: (saved, input) => {
      queryClient.setQueryData(["household-preferences", householdId], saved);
      queryClient.invalidateQueries({ queryKey: ["household-preferences", householdId] });
      const silent = (input as { __silent?: boolean } | undefined)?.__silent === true;
      if (!silent) toast.success("Preferences updated!");
    },
    onError: (error: any, _updates, context) => {
      queryClient.setQueryData(["household-preferences", householdId], context?.previous ?? null);
      const msg = String(error?.message ?? "");
      if (msg.includes("Failed to fetch")) {
        toast.error("You appear to be offline — changes will sync when reconnected.");
      } else {
        toast.error("Failed to update preferences: " + msg);
      }
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: async (
      updates: Partial<HouseholdPreferences>,
      options?: { silent?: boolean },
    ) => {
      await updatePreferences.mutateAsync({ ...updates, __silent: options?.silent } as any);
    },
    isUpdating: updatePreferences.isPending,
  };
};
