import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// ─── Types ───────────────────────────────────────────────────

export interface FinanceAccount {
  id: string;
  household_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  household_id: string;
  account_id: string | null;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurring_pattern: any;
  tagged_member: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceBudget {
  id: string;
  household_id: string;
  month: string;
  category: string;
  planned_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceSavingsGoal {
  id: string;
  household_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceMonthlySnapshot {
  id: string;
  household_id: string;
  month: string;
  total_income: number;
  total_spend: number;
  savings_actual: number;
  budget_health_score: number | null;
  created_at: string;
}

export const FINANCE_CATEGORIES = [
  "groceries",
  "rent",
  "utilities",
  "transport",
  "dining_out",
  "entertainment",
  "education",
  "healthcare",
  "clothing",
  "household",
  "subscriptions",
  "gifts",
  "savings",
  "salary",
  "freelance",
  "investment",
  "other",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  rent: "Rent",
  utilities: "Utilities",
  transport: "Transport",
  dining_out: "Dining Out",
  entertainment: "Entertainment",
  education: "Education",
  healthcare: "Healthcare",
  clothing: "Clothing",
  household: "Household",
  subscriptions: "Subscriptions",
  gifts: "Gifts & Donations",
  savings: "Savings",
  salary: "Salary",
  freelance: "Freelance",
  investment: "Investment Returns",
  other: "Other",
};

// ─── Hooks ───────────────────────────────────────────────────

export const useFinanceAccounts = (householdId: string | null) => {
  return useQuery({
    queryKey: ["finance-accounts", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at");
      if (error) throw error;
      return data as FinanceAccount[];
    },
    enabled: !!householdId,
  });
};

export const useFinanceTransactions = (
  householdId: string | null,
  filters?: { month?: string; category?: string; type?: string; search?: string }
) => {
  return useQuery({
    queryKey: ["finance-transactions", householdId, filters],
    queryFn: async () => {
      let query = supabase
        .from("finance_transactions")
        .select("*")
        .eq("household_id", householdId!)
        .order("transaction_date", { ascending: false })
        .limit(200);

      if (filters?.month) {
        query = query
          .gte("transaction_date", `${filters.month}-01`)
          .lt("transaction_date", `${filters.month}-01`);
        // Calculate end of month
        const [y, m] = filters.month.split("-").map(Number);
        const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
        query = supabase
          .from("finance_transactions")
          .select("*")
          .eq("household_id", householdId!)
          .gte("transaction_date", `${filters.month}-01`)
          .lt("transaction_date", `${nextMonth}-01`)
          .order("transaction_date", { ascending: false })
          .limit(200);
      }

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters?.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters?.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinanceTransaction[];
    },
    enabled: !!householdId,
  });
};

export const useFinanceBudgets = (householdId: string | null, month?: string) => {
  const currentMonth = month || format(new Date(), "yyyy-MM");
  return useQuery({
    queryKey: ["finance-budgets", householdId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_budgets")
        .select("*")
        .eq("household_id", householdId!)
        .eq("month", currentMonth)
        .order("category");
      if (error) throw error;
      return data as FinanceBudget[];
    },
    enabled: !!householdId,
  });
};

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
  });
};

export const useFinanceMonthlySnapshot = (householdId: string | null, month?: string) => {
  const currentMonth = month || format(new Date(), "yyyy-MM");
  return useQuery({
    queryKey: ["finance-snapshot", householdId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_monthly_snapshots")
        .select("*")
        .eq("household_id", householdId!)
        .eq("month", currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data as FinanceMonthlySnapshot | null;
    },
    enabled: !!householdId,
  });
};

export const useFinanceMonthlySummary = (householdId: string | null, month?: string) => {
  const currentMonth = month || format(new Date(), "yyyy-MM");
  return useQuery({
    queryKey: ["finance-monthly-summary", householdId, currentMonth],
    queryFn: async () => {
      const [y, m] = currentMonth.split("-").map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("household_id", householdId!)
        .gte("transaction_date", `${currentMonth}-01`)
        .lt("transaction_date", `${nextMonth}-01`);

      if (error) throw error;

      const transactions = data as FinanceTransaction[];
      const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

      // Category breakdown for expenses
      const categoryBreakdown: Record<string, number> = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Number(t.amount);
        });

      return {
        income,
        expenses,
        savings: income - expenses,
        cashLeft: income - expenses,
        categoryBreakdown,
        transactionCount: transactions.length,
      };
    },
    enabled: !!householdId,
  });
};

// ─── Mutations ───────────────────────────────────────────────

export const useCreateTransaction = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<FinanceTransaction>) => {
      const { data: inserted, error } = await supabase
        .from("finance_transactions")
        .insert({
          household_id: householdId!,
          created_by: user!.id,
          amount: data.amount!,
          type: data.type || "expense",
          category: data.category || "other",
          description: data.description || null,
          transaction_date: data.transaction_date || format(new Date(), "yyyy-MM-dd"),
          account_id: data.account_id || null,
          is_recurring: data.is_recurring || false,
          tagged_member: data.tagged_member || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return inserted as FinanceTransaction;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["finance-transactions", householdId] });
      const optimistic: FinanceTransaction = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        account_id: data.account_id || null,
        amount: Number(data.amount) || 0,
        type: (data.type as "income" | "expense") || "expense",
        category: data.category || "other",
        description: data.description ?? null,
        transaction_date: data.transaction_date || format(new Date(), "yyyy-MM-dd"),
        is_recurring: data.is_recurring || false,
        recurring_pattern: null,
        tagged_member: data.tagged_member ?? null,
        notes: data.notes ?? null,
        created_by: user?.id || "",
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
      toast.success("Transaction added");
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
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
    },
    onSettled: () => {
      // Light reconciliation; the cache already holds the real row so this
      // is just a safety net for edge cases (filters that excluded it, etc.).
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
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
      toast.success("Transaction updated");
      return { snapshots };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
    },
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
      toast.success("Transaction deleted");
      return { snapshots };
    },
    onError: (e: Error, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
    },
  });
};

export const useUpsertBudget = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { month: string; category: string; planned_amount: number }) => {
      const { data: row, error } = await supabase.from("finance_budgets").upsert(
        {
          household_id: householdId!,
          created_by: user!.id,
          month: data.month,
          category: data.category,
          planned_amount: data.planned_amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "household_id,month,category" }
      ).select().single();
      if (error) throw error;
      return row as FinanceBudget;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["finance-budgets", householdId] });
      const optimistic: FinanceBudget = {
        id: `optimistic-${Date.now()}`,
        household_id: householdId!,
        month: data.month,
        category: data.category,
        planned_amount: data.planned_amount,
        created_by: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const snapshots: Array<[readonly unknown[], unknown]> = [];
      queryClient
        .getQueriesData<FinanceBudget[]>({ queryKey: ["finance-budgets", householdId] })
        .forEach(([key, prev]) => {
          snapshots.push([key, prev]);
          if (Array.isArray(prev)) {
            const idx = prev.findIndex((b) => b.category === data.category && b.month === data.month);
            const next = idx >= 0
              ? prev.map((b, i) => (i === idx ? { ...b, planned_amount: data.planned_amount } : b))
              : [optimistic, ...prev];
            queryClient.setQueryData(key, next);
          }
        });
      toast.success("Budget saved");
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
    },
    onSuccess: (row, _vars, ctx) => {
      if (!row) return;
      queryClient
        .getQueriesData<FinanceBudget[]>({ queryKey: ["finance-budgets", householdId] })
        .forEach(([key, list]) => {
          if (!Array.isArray(list)) return;
          queryClient.setQueryData(
            key,
            list.map((b) => (b.id === ctx?.optimisticId || (b.category === row.category && b.month === row.month) ? row : b))
          );
        });
    },
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
      toast.success("Savings goal created");
      return { snapshots, optimisticId: optimistic.id };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
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
      toast.success("Goal updated");
      return { snapshots };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
    },
  });
};

export const useDeleteSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_savings_goals").delete().eq("id", id);
      if (error) throw error;
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
      toast.success("Goal deleted");
      return { snapshots };
    },
    onError: (e: Error, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, prev]) => queryClient.setQueryData(key, prev));
      toast.error(e.message);
    },
  });
};

// ─── Realtime sync across household members ────────────────────

/**
 * Subscribe to all finance tables for the given household so any member's
 * insert/update/delete is reflected on every other member's screen within ~1s.
 */
export const useFinanceRealtime = (householdId: string | null) => {
  const filter = householdId ? `household_id=eq.${householdId}` : undefined;
  useRealtimeSubscription([
    {
      table: "finance_transactions",
      filter,
      enabled: !!householdId,
      queryKeys: [
        ["finance-transactions", householdId],
        ["finance-monthly-summary", householdId],
        ["finance-dashboard", householdId],
        ["finance-snapshot", householdId],
      ],
    },
    {
      table: "finance_budgets",
      filter,
      enabled: !!householdId,
      queryKeys: [["finance-budgets", householdId]],
    },
    {
      table: "finance_savings_goals",
      filter,
      enabled: !!householdId,
      queryKeys: [["finance-savings-goals", householdId]],
    },
    {
      table: "finance_subscriptions",
      filter,
      enabled: !!householdId,
      queryKeys: [["finance-subscriptions", householdId]],
    },
    {
      table: "finance_user_cards",
      filter,
      enabled: !!householdId,
      queryKeys: [["user-cards", householdId]],
    },
  ]);
};
