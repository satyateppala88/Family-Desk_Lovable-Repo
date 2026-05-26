import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { FinanceSavingsGoal } from "./types";

export const useFinanceSavingsGoals = (householdId: string | null) => {
  return useQuery({
    queryKey: ["finance-savings-goals", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_savings_goals")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinanceSavingsGoal[];
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });
};

export const useCreateSavingsGoal = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<FinanceSavingsGoal>) => {
      const { data: inserted, error } = await supabase.from("finance_savings_goals").insert({
        household_id: householdId!,
        created_by: user!.id,
        name: data.name!,
        target_amount: data.target_amount!,
        current_amount: data.current_amount || 0,
        target_date: data.target_date || null,
      }).select().single();
      if (error) throw error;
      return inserted as FinanceSavingsGoal;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["finance-savings-goals", householdId] });
      const optimistic: FinanceSavingsGoal = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        name: data.name || "",
        target_amount: Number(data.target_amount) || 0,
        current_amount: Number(data.current_amount) || 0,
        target_date: data.target_date || null,
        status: "active",
        created_by: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceSavingsGoal[]>({ queryKey: ["finance-savings-goals", householdId] })
        .forEach(([key, prev]) => {
          snapshots.push([key, prev]);
          if (Array.isArray(prev)) queryClient.setQueryData(key, [optimistic, ...prev]);
        });
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      console.error("[useCreateSavingsGoal] failed", e);
      toast.error(e.message);
    },
    onSuccess: (inserted, _vars, ctx) => {
      queryClient
        .getQueriesData<FinanceSavingsGoal[]>({ queryKey: ["finance-savings-goals", householdId] })
        .forEach(([key, list]) => {
          if (!Array.isArray(list)) return;
          queryClient.setQueryData(
            key,
            list.map((g) => (g.id === ctx?.optimisticId ? inserted : g))
          );
        });
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals", householdId] });
      toast.success("Savings goal created");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals", householdId] });

    },
  });
};

export const useUpdateSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinanceSavingsGoal> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from("finance_savings_goals")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated as FinanceSavingsGoal;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["finance-savings-goals"] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceSavingsGoal[]>({ queryKey: ["finance-savings-goals"] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (!Array.isArray(list)) return;
          queryClient.setQueryData(
            key,
            list.map((g) => (g.id === vars.id ? { ...g, ...vars } : g))
          );
        });
      return { snapshots };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      console.error("[useUpdateSavingsGoal] failed", e);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Goal updated");
      // B5: defer invalidation so the edit dialog has fully unmounted before
      // queries refetch — otherwise the still-mounted form leaks stale state
      // into the card behind it.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      }, 50);
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      }, 50);
    },
  });
};

export const useDeleteSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_savings_goals")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["finance-savings-goals"] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceSavingsGoal[]>({ queryKey: ["finance-savings-goals"] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (Array.isArray(list)) {
            queryClient.setQueryData(key, list.filter((g) => g.id !== id));
          }
        });
      return { snapshots };
    },
    onError: (e: Error, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      console.error("[useDeleteSavingsGoal] failed", e);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Goal deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });

    },
  });
};