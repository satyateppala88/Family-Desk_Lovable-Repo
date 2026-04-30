import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import {
  MODULE_SETUP_FIELDS,
  type ModuleSetupKey,
} from "@/lib/moduleSetup";

interface CompletedMap {
  [key: string]: boolean;
}

/**
 * Tracks whether the per-module first-run setup is complete for the current
 * user. Backed by `profiles.completed_tours`. Auto-marks the key complete if
 * the relevant household preference fields are already populated (so returning
 * users aren't re-asked for data they've supplied via the legacy onboarding).
 */
export const useModuleSetup = (key: ModuleSetupKey) => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { preferences } = useHouseholdPreferences(householdId);
  const queryClient = useQueryClient();

  const { data: completed, isLoading } = useQuery({
    queryKey: ["module-setup", user?.id],
    queryFn: async () => {
      if (!user?.id) return {} as CompletedMap;
      const { data } = await supabase
        .from("profiles")
        .select("completed_tours")
        .eq("id", user.id)
        .single();
      return ((data?.completed_tours as CompletedMap) ?? {});
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const next = { ...(completed ?? {}), [key]: true };
      const { error } = await supabase
        .from("profiles")
        .update({ completed_tours: next })
        .eq("id", user.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["module-setup", user?.id], next);
      queryClient.invalidateQueries({ queryKey: ["completed-tours", user?.id] });
    },
  });

  // Backfill: if the user already has the data this module would ask for,
  // silently mark the setup complete so we don't re-prompt.
  const hasRequiredData = useMemo(() => {
    if (!preferences) return false;
    const fields = MODULE_SETUP_FIELDS[key];
    return fields.every((f) => {
      const v = (preferences as unknown as Record<string, unknown>)[f as string];
      return v !== null && v !== undefined && v !== "";
    });
  }, [preferences, key]);

  useEffect(() => {
    if (isLoading) return;
    if (completed?.[key]) return;
    if (hasRequiredData && user?.id) {
      markComplete.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, completed, hasRequiredData, key, user?.id]);

  const isComplete = !!completed?.[key] || hasRequiredData;
  const needsSetup = !isLoading && !!user?.id && !!householdId && !isComplete;

  return {
    isLoading,
    isComplete,
    needsSetup,
    markComplete: () => markComplete.mutateAsync(),
    isMarking: markComplete.isPending,
  };
};
