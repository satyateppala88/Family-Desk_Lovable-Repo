import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { STALE } from "@/lib/query-constants";

export type CategoryScope = "transaction" | "subscription" | "all";

export interface CustomCategory {
  id: string;
  household_id: string;
  key: string;
  label: string;
  scope: CategoryScope;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const slugifyCategoryKey = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

export function useCustomCategories(scope: CategoryScope = "all") {
  const { householdId } = useHousehold();
  const qc = useQueryClient();

  useRealtimeSubscription([
    {
      table: "finance_custom_categories",
      filter: householdId ? `household_id=eq.${householdId}` : undefined,
      queryKeys: [["finance-custom-categories", householdId]],
      enabled: !!householdId,
    },
  ], householdId);

  const query = useQuery({
    queryKey: ["finance-custom-categories", householdId],
    enabled: !!householdId,
    staleTime: STALE.LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_custom_categories")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as CustomCategory[];
    },
  });

  const all = query.data || [];
  const filtered = all.filter((c) => c.scope === "all" || c.scope === scope);

  return {
    categories: filtered,
    allCategories: all,
    isLoading: query.isLoading,
    refetch: query.refetch,
    invalidate: () => qc.invalidateQueries({ queryKey: ["finance-custom-categories", householdId] }),
  };
}

export function useAddCustomCategory() {
  const { householdId } = useHousehold();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; scope?: CategoryScope; reservedKeys?: readonly string[]; reservedLabels?: Record<string, string> }) => {
      const label = input.label.trim();
      if (!label) throw new Error("Category name is required");
      const key = slugifyCategoryKey(label);
      if (!key) throw new Error("Please use letters or numbers");
      const reservedKeys = (input.reservedKeys || []).map((k) => k.toLowerCase());
      if (reservedKeys.includes(key)) {
        throw new Error("RESERVED_KEY");
      }
      const reservedLabels = Object.values(input.reservedLabels || {}).map((l) => l.trim().toLowerCase());
      if (reservedLabels.includes(label.toLowerCase())) {
        throw new Error("RESERVED_KEY");
      }
      const { data, error } = await supabase
        .from("finance_custom_categories")
        .insert({
          household_id: householdId!,
          key,
          label,
          scope: input.scope || "all",
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CustomCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-custom-categories", householdId] });
      toast.success("Category added");
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      console.error("[useAddCustomCategory] failed", { householdId, code: e?.code, msg });
      if (msg === "RESERVED_KEY") {
        toast.error("That name matches a built-in category. Pick a different name.");
      } else if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("That category already exists");
      } else {
        toast.error(msg || "Failed to add category");
      }
    },
  });
}

export function useDeleteCustomCategory() {
  const { householdId } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_custom_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-custom-categories", householdId] });
      toast.success("Category removed");
    },
    onError: () => toast.error("Failed to remove category"),
  });
}

export function useUpdateCustomCategory() {
  const { householdId } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      label?: string;
      scope?: CategoryScope;
      reservedLabels?: Record<string, string>;
    }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof input.label === "string") {
        const label = input.label.trim();
        if (!label) throw new Error("Category name is required");
        const reservedLabels = Object.values(input.reservedLabels || {}).map((l) =>
          l.trim().toLowerCase()
        );
        if (reservedLabels.includes(label.toLowerCase())) {
          throw new Error("RESERVED_LABEL");
        }
        patch.label = label;
      }
      if (input.scope) patch.scope = input.scope;
      const { data, error } = await supabase
        .from("finance_custom_categories")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as CustomCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-custom-categories", householdId] });
      toast.success("Category updated");
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      if (msg === "RESERVED_LABEL") {
        toast.error("That name matches a built-in category. Pick a different name.");
      } else if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Another category already uses that name");
      } else {
        toast.error(msg || "Failed to update category");
      }
    },
  });
}