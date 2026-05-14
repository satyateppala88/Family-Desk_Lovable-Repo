import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import {
  MODULE_SETUP_FIELDS,
  MODULE_SETUP_COLUMN,
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
  const { preferences, updatePreferences, isLoading } = useHouseholdPreferences(householdId);
  const queryClient = useQueryClient();
  const backfillFiredRef = useRef(false);

  const completed = (preferences?.completed_module_setups as CompletedMap | undefined) ?? {};
  const typedColumn = MODULE_SETUP_COLUMN[key];
  const typedColumnComplete =
    typedColumn != null
      ? (preferences as unknown as Record<string, unknown> | null)?.[typedColumn as string] === true
      : false;

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error("No household");
      if (typedColumn != null) {
        // Write the deterministic boolean column — no jsonb merge race.
        await updatePreferences({ [typedColumn]: true } as any, { silent: true });
        return { [typedColumn]: true };
      }
      const next = { ...completed, [key]: true };
      await updatePreferences({ completed_module_setups: next } as any, { silent: true });
      return next;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-preferences", householdId] });
    },
  });

  // Backfill: if the user already has the data this module would ask for,
  // silently mark the setup complete so we don't re-prompt.
  const hasRequiredData = useMemo(() => {
    if (!preferences) return false;
    const fields = MODULE_SETUP_FIELDS[key];
    return fields.some((f) => {
      const v = (preferences as unknown as Record<string, unknown>)[f as string];
      if (v === null || v === undefined || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    });
  }, [preferences, key]);

  useEffect(() => {
    if (isLoading) return;
    if (typedColumnComplete) return;
    if (completed?.[key]) return;
    if (backfillFiredRef.current) return;
    if (hasRequiredData && householdId) {
      backfillFiredRef.current = true;
      // Silent backfill — never surface a toast for this background write.
      markComplete.mutateAsync().catch(() => {
        backfillFiredRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, completed, hasRequiredData, key, householdId, typedColumnComplete]);

  const isComplete = typedColumnComplete || !!completed?.[key] || hasRequiredData;
  const needsSetup = !isLoading && !!user?.id && !!householdId && !isComplete;

  return {
    isLoading,
    isComplete,
    needsSetup,
    markComplete: () => markComplete.mutateAsync(),
    isMarking: markComplete.isPending,
  };
};
