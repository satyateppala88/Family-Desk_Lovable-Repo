import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

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
      const { error } = await supabase.from("finance_transactions").insert({
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Transaction added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinanceTransaction> & { id: string }) => {
      const { error } = await supabase
        .from("finance_transactions")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      toast.success("Transaction updated");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      toast.success("Transaction deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpsertBudget = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { month: string; category: string; planned_amount: number }) => {
      const { error } = await supabase.from("finance_budgets").upsert(
        {
          household_id: householdId!,
          created_by: user!.id,
          month: data.month,
          category: data.category,
          planned_amount: data.planned_amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "household_id,month,category" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
      toast.success("Budget saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCreateSavingsGoal = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<FinanceSavingsGoal>) => {
      const { error } = await supabase.from("finance_savings_goals").insert({
        household_id: householdId!,
        created_by: user!.id,
        name: data.name!,
        target_amount: data.target_amount!,
        current_amount: data.current_amount || 0,
        target_date: data.target_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      toast.success("Savings goal created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinanceSavingsGoal> & { id: string }) => {
      const { error } = await supabase
        .from("finance_savings_goals")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      toast.success("Goal updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      toast.success("Goal deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
