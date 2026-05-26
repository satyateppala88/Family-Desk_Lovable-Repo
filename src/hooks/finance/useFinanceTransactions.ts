import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { markSelfWrite } from "@/hooks/useRealtimeSubscription";
import type { FinanceTransaction } from "./types";

export const useFinanceTransactions = (
  householdId: string | null,
  filters?: { month?: string; category?: string; type?: string; search?: string; paidBy?: string }
) => {
  return useQuery({
    queryKey: ["finance-transactions", householdId, filters],
    queryFn: async () => {
      let query = supabase
        .from("finance_transactions")
        .select("*")
        .eq("household_id", householdId!)
        .order("transaction_date", { ascending: false })
        .limit(500);

      if (filters?.month) {
        const [y, m] = filters.month.split("-").map(Number);
        const nextMonth = m === 12
          ? `${y + 1}-01`
          : `${y}-${String(m + 1).padStart(2, "0")}`;
        query = query
          .gte("transaction_date", `${filters.month}-01`)
          .lt("transaction_date", `${nextMonth}-01`);
      }
      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters?.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters?.paidBy && filters.paidBy !== "all") {
        query = query.eq("paid_by", filters.paidBy);
      }
      if (filters?.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinanceTransaction[];
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });
};

export const useCreateTransaction = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<FinanceTransaction>) => {
      if (!data.amount || data.amount <= 0) throw new Error('Amount must be greater than zero');
      if (!data.category) throw new Error('Category is required');

      const { data: inserted, error } = await supabase
        .from("finance_transactions")
        .insert({
          household_id: householdId!,
          created_by: user!.id,
          paid_by: data.paid_by || user!.id,
          amount: data.amount!,
          type: data.type || "expense",
          category: data.category || "other",
          description: data.description || null,
          transaction_date: data.transaction_date || format(new Date(), "yyyy-MM-dd"),
          account_id: data.account_id || null,
          is_recurring: data.is_recurring || false,
          tagged_member: data.tagged_member || null,
          notes: data.notes || null,
          savings_goal_id: data.savings_goal_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return inserted as FinanceTransaction;
    },
    onMutate: async (data) => {
      markSelfWrite("finance_transactions");
      await queryClient.cancelQueries({ queryKey: ["finance-transactions", householdId] });
      const optimistic: FinanceTransaction = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        account_id: data.account_id || null,
        amount: Number(data.amount) || 0,
        type: (data.type as "income" | "expense" | "savings") || "expense",
        category: data.category || "other",
        description: data.description ?? null,
        transaction_date: data.transaction_date || format(new Date(), "yyyy-MM-dd"),
        is_recurring: data.is_recurring || false,
        recurring_pattern: null,
        tagged_member: data.tagged_member ?? null,
        notes: data.notes ?? null,
        created_by: user?.id || "",
        paid_by: data.paid_by ?? user?.id ?? null,
        savings_goal_id: data.savings_goal_id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceTransaction[]>({ queryKey: ["finance-transactions", householdId] })
        .forEach(([key, prev]) => {
          snapshots.push([key, prev]);
          if (Array.isArray(prev)) queryClient.setQueryData(key, [optimistic, ...prev]);
        });
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (e: any, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      console.error("[useCreateTransaction] failed", e);
      if (e?.code === "23505") {
        toast.error("A budget for this category already exists. Use Edit to update it.");
      } else {
        toast.error(e?.message || "Failed to save transaction. Please try again.");
      }
    },
    onSuccess: (inserted, _vars, ctx) => {
      // Replace the optimistic placeholder with the real row in-place.
      queryClient
        .getQueriesData<FinanceTransaction[]>({ queryKey: ["finance-transactions", householdId] })
        .forEach(([key, list]) => {
          if (!Array.isArray(list)) return;
          queryClient.setQueryData(
            key,
            list.map((t) => (t.id === ctx?.optimisticId ? inserted : t))
          );
        });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals", householdId] });
      toast.success("Transaction added");
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinanceTransaction> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from("finance_transactions")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated as FinanceTransaction;
    },
    onMutate: async (vars) => {
      markSelfWrite("finance_transactions");
      await queryClient.cancelQueries({ queryKey: ["finance-transactions"] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceTransaction[]>({ queryKey: ["finance-transactions"] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (!Array.isArray(list)) return;
          queryClient.setQueryData(
            key,
            list.map((t) => (t.id === vars.id ? { ...t, ...vars } : t))
          );
        });
      return { snapshots };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      console.error("[useUpdateTransaction] failed", e);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Transaction updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget"] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
    },
  });
};

export const useBulkUpdateTransactionCategory = (householdId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, category }: { ids: string[]; category: string }) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("finance_transactions")
        .update({ category, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Moved ${vars.ids.length} transaction${vars.ids.length === 1 ? "" : "s"}`);
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary", householdId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      markSelfWrite("finance_transactions");
      await queryClient.cancelQueries({ queryKey: ["finance-transactions"] });
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceTransaction[]>({ queryKey: ["finance-transactions"] })
        .forEach(([key, list]) => {
          snapshots.push([key, list]);
          if (Array.isArray(list)) {
            queryClient.setQueryData(key, list.filter((t) => t.id !== id));
          }
        });
      return { snapshots };
    },
    onError: (e: Error, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      console.error("[useDeleteTransaction] failed", e);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Transaction deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget"] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
    },
  });
};