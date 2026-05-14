import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SavingsContribution {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  transaction_date: string;
  paid_by: string | null;
  savings_goal_id: string | null;
}

/**
 * Fetch all savings-typed transactions for the household.
 * Used to compute actuals per goal and the savings timeline chart.
 */
export const useSavingsContributions = (householdId: string | null) => {
  return useQuery({
    queryKey: ["savings-contributions", householdId],
    queryFn: async (): Promise<SavingsContribution[]> => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("id, amount, category, description, transaction_date, paid_by, savings_goal_id")
        .eq("household_id", householdId)
        .eq("type", "savings")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return (data || []) as SavingsContribution[];
    },
    enabled: !!householdId,
    staleTime: 1000 * 60,
  });
};