import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { FinanceMonthlySnapshot, FinanceTransaction } from "./types";

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
      const saved = transactions.filter((t) => t.type === "savings").reduce((s, t) => s + Number(t.amount), 0);

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
        saved,
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