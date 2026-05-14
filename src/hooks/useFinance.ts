import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
  type: "income" | "expense" | "savings";
  category: string;
  description: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurring_pattern: any;
  tagged_member: string | null;
  notes: string | null;
  created_by: string;
  paid_by: string | null;
  savings_goal_id: string | null;
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
  // Household
  "groceries",
  "vegetables_fruits",
  "dairy_eggs",
  "lpg_cylinder",
  "electricity",
  "water",
  "piped_gas",
  "society_maintenance",
  "house_rent",
  "home_loan_emi",
  "domestic_help",
  "security_guard_tip",
  // Family
  "school_tuition_fees",
  "stationery_books",
  "childrens_activities",
  "medical_pharmacy",
  "doctor_consultation",
  "temple_pooja_donation",
  // Lifestyle
  "dining_out",
  "food_delivery",
  "entertainment",
  "clothing_accessories",
  "personal_care",
  // Transport & Finance
  "petrol_cng",
  "vehicle_emi",
  "vehicle_insurance",
  "auto_cab_metro",
  "travel",
  "personal_loan_emi",
  "credit_card_bill",
  "life_health_insurance",
  "sip_investment",
  // Income
  "salary",
  "freelance",
  "investment_returns",
  // Other
  "other",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  vegetables_fruits: "Vegetables & Fruits",
  dairy_eggs: "Dairy & Eggs",
  lpg_cylinder: "LPG Cylinder",
  electricity: "Electricity",
  water: "Water",
  piped_gas: "Piped Gas",
  society_maintenance: "Society Maintenance",
  house_rent: "House Rent",
  home_loan_emi: "Home Loan EMI",
  domestic_help: "Domestic Help (Maid/Cook/Driver)",
  security_guard_tip: "Security Guard Tip",
  school_tuition_fees: "School / Tuition Fees",
  stationery_books: "Stationery & Books",
  childrens_activities: "Children's Activities",
  medical_pharmacy: "Medical / Pharmacy",
  doctor_consultation: "Doctor Consultation",
  temple_pooja_donation: "Temple / Pooja / Donation",
  dining_out: "Dining Out",
  food_delivery: "Food Delivery (Swiggy/Zomato)",
  entertainment: "Entertainment (OTT, Movies, Events)",
  clothing_accessories: "Clothing & Accessories",
  personal_care: "Personal Care",
  petrol_cng: "Petrol / CNG",
  vehicle_emi: "Vehicle EMI",
  vehicle_insurance: "Vehicle Insurance",
  auto_cab_metro: "Auto / Cab / Metro",
  travel: "Travel (train/flight)",
  personal_loan_emi: "Personal Loan EMI",
  credit_card_bill: "Credit Card Bill",
  life_health_insurance: "Life / Health Insurance Premium",
  sip_investment: "SIP / Investment",
  salary: "Salary",
  freelance: "Freelance",
  investment_returns: "Investment Returns",
  other: "Other",
};

/** Visual grouping for the category dropdown. */
export const CATEGORY_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Household",
    keys: [
      "groceries", "vegetables_fruits", "dairy_eggs",
      "lpg_cylinder", "electricity", "water", "piped_gas",
      "society_maintenance", "house_rent", "home_loan_emi",
      "domestic_help", "security_guard_tip",
    ],
  },
  {
    label: "Family",
    keys: [
      "school_tuition_fees", "stationery_books", "childrens_activities",
      "medical_pharmacy", "doctor_consultation", "temple_pooja_donation",
    ],
  },
  {
    label: "Lifestyle",
    keys: [
      "dining_out", "food_delivery", "entertainment",
      "clothing_accessories", "personal_care",
    ],
  },
  {
    label: "Transport & Finance",
    keys: [
      "petrol_cng", "vehicle_emi", "vehicle_insurance",
      "auto_cab_metro", "travel", "personal_loan_emi",
      "credit_card_bill", "life_health_insurance", "sip_investment",
    ],
  },
  {
    label: "Income",
    keys: ["salary", "freelance", "investment_returns"],
  },
  {
    label: "Other",
    keys: ["other"],
  },
];

/**
 * Maps legacy category keys (still present in historical
 * finance_transactions / finance_budgets rows) to the closest current key.
 * Used for label resolution and benefit lookups so old data keeps rendering
 * with friendly Indian-specific names without a DB migration.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  rent: "house_rent",
  utilities: "electricity",
  transport: "auto_cab_metro",
  education: "school_tuition_fees",
  healthcare: "medical_pharmacy",
  clothing: "clothing_accessories",
  household: "society_maintenance",
  gifts: "temple_pooja_donation",
  savings: "sip_investment",
  investment: "investment_returns",
  subscriptions: "other",
};

/** Sub-categories shown when transaction type = "savings". */
export const SAVINGS_CATEGORIES = [
  "sip",
  "mutual_fund",
  "fixed_deposit",
  "stocks",
  "bank_deposit",
  "other",
] as const;

export const SAVINGS_CATEGORY_LABELS: Record<string, string> = {
  sip: "SIP",
  mutual_fund: "Mutual Fund",
  fixed_deposit: "Fixed Deposit",
  stocks: "Stocks",
  bank_deposit: "Bank Deposit",
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
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
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
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
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
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
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
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
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
        .select("amount,type,category")
        .eq("household_id", householdId!)
        .gte("transaction_date", `${currentMonth}-01`)
        .lt("transaction_date", `${nextMonth}-01`);

      if (error) throw error;

      const transactions = (data as Array<Pick<FinanceTransaction, "amount" | "type" | "category">>) || [];
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
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
    },
    onSettled: () => {
      // Light reconciliation; the cache already holds the real row so this
      // is just a safety net for edge cases (filters that excluded it, etc.).
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
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
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget"] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
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
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
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
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget"] });
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] });
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
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-annual-budget", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
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
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals", householdId] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard", householdId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
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
  ], householdId);
};

// ─── Carry-forward & Annual rollup ───────────────────────────

/**
 * Clones the most recent prior month's budgets into `month` if `month` has
 * no rows yet. Returns { cloned: number, sourceMonth: string | null }.
 */
export const useCarryForwardBudgets = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (month: string) => {
      if (!householdId) return { cloned: 0, sourceMonth: null as string | null, insertedIds: [] as string[] };
      // Skip if already populated.
      const { data: existing, error: existingErr } = await supabase
        .from("finance_budgets")
        .select("id")
        .eq("household_id", householdId)
        .eq("month", month)
        .limit(1);
      if (existingErr) throw existingErr;
      if (existing && existing.length > 0) return { cloned: 0, sourceMonth: null, insertedIds: [] };

      // Find the most recent prior month with budgets.
      const { data: prior, error: priorErr } = await supabase
        .from("finance_budgets")
        .select("month")
        .eq("household_id", householdId)
        .lt("month", month)
        .order("month", { ascending: false })
        .limit(1);
      if (priorErr) throw priorErr;
      const sourceMonth = prior?.[0]?.month as string | undefined;
      if (!sourceMonth) return { cloned: 0, sourceMonth: null, insertedIds: [] };

      const { data: rows, error: rowsErr } = await supabase
        .from("finance_budgets")
        .select("category,planned_amount")
        .eq("household_id", householdId)
        .eq("month", sourceMonth);
      if (rowsErr) throw rowsErr;
      if (!rows || rows.length === 0) return { cloned: 0, sourceMonth, insertedIds: [] };

      const payload = rows.map((r) => ({
        household_id: householdId,
        created_by: user!.id,
        month,
        category: r.category,
        planned_amount: r.planned_amount,
      }));

      const { data: inserted, error: insErr } = await supabase
        .from("finance_budgets")
        .upsert(payload, { onConflict: "household_id,month,category", ignoreDuplicates: true })
        .select("id");
      if (insErr) throw insErr;
      return {
        cloned: inserted?.length || 0,
        sourceMonth,
        insertedIds: (inserted || []).map((r) => r.id as string),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-budgets", householdId] });
    },
  });
};

export interface AnnualBudgetRow {
  category: string;
  monthlyPlanned: number[]; // length 12, index 0 = Jan
  monthlyActual: number[];
  annualPlanned: number;
  annualActual: number;
}

export interface AnnualBudgetData {
  year: number;
  totalPlanned: number;
  totalActual: number;
  monthlyPlanned: number[]; // length 12
  monthlyActual: number[];
  rows: AnnualBudgetRow[];
}

export const useFinanceAnnualBudget = (householdId: string | null, year: number) => {
  return useQuery({
    queryKey: ["finance-annual-budget", householdId, year],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async (): Promise<AnnualBudgetData> => {
      const yStart = `${year}-01`;
      const yEnd = `${year}-12`;
      const dateStart = `${year}-01-01`;
      const dateEnd = `${year + 1}-01-01`;

      const [budgetsRes, txnsRes] = await Promise.all([
        supabase
          .from("finance_budgets")
          .select("month,category,planned_amount")
          .eq("household_id", householdId!)
          .gte("month", yStart)
          .lte("month", yEnd),
        supabase
          .from("finance_transactions")
          .select("transaction_date,category,amount,type")
          .eq("household_id", householdId!)
          .eq("type", "expense")
          .gte("transaction_date", dateStart)
          .lt("transaction_date", dateEnd),
      ]);
      if (budgetsRes.error) throw budgetsRes.error;
      if (txnsRes.error) throw txnsRes.error;

      const byCat = new Map<string, AnnualBudgetRow>();
      const ensure = (cat: string): AnnualBudgetRow => {
        let r = byCat.get(cat);
        if (!r) {
          r = {
            category: cat,
            monthlyPlanned: Array(12).fill(0),
            monthlyActual: Array(12).fill(0),
            annualPlanned: 0,
            annualActual: 0,
          };
          byCat.set(cat, r);
        }
        return r;
      };

      (budgetsRes.data || []).forEach((b: any) => {
        const m = parseInt(String(b.month).slice(5, 7), 10) - 1;
        if (m < 0 || m > 11) return;
        const row = ensure(b.category);
        row.monthlyPlanned[m] += Number(b.planned_amount) || 0;
        row.annualPlanned += Number(b.planned_amount) || 0;
      });
      (txnsRes.data || []).forEach((t: any) => {
        const m = parseInt(String(t.transaction_date).slice(5, 7), 10) - 1;
        if (m < 0 || m > 11) return;
        const row = ensure(t.category);
        row.monthlyActual[m] += Number(t.amount) || 0;
        row.annualActual += Number(t.amount) || 0;
      });

      const rows = Array.from(byCat.values()).sort(
        (a, b) => b.annualPlanned + b.annualActual - (a.annualPlanned + a.annualActual)
      );
      const monthlyPlanned = Array(12).fill(0);
      const monthlyActual = Array(12).fill(0);
      rows.forEach((r) => {
        for (let i = 0; i < 12; i++) {
          monthlyPlanned[i] += r.monthlyPlanned[i];
          monthlyActual[i] += r.monthlyActual[i];
        }
      });
      return {
        year,
        totalPlanned: monthlyPlanned.reduce((a, b) => a + b, 0),
        totalActual: monthlyActual.reduce((a, b) => a + b, 0),
        monthlyPlanned,
        monthlyActual,
        rows,
      };
    },
  });
};
