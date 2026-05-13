import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Aggregates income transactions for the given month by `created_by`.
 * Returns a Map<userId, totalRupees>.
 */
export const useMemberContributions = (
  householdId: string | null,
  month: string | null,
) => {
  return useQuery({
    queryKey: ["member-contributions", householdId, month],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!householdId || !month) return {};
      const [y, m] = month.split("-").map(Number);
      const nextMonth =
        m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("created_by, amount")
        .eq("household_id", householdId)
        .eq("type", "income")
        .gte("transaction_date", `${month}-01`)
        .lt("transaction_date", `${nextMonth}-01`);
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const row of data || []) {
        if (!row.created_by) continue;
        totals[row.created_by] =
          (totals[row.created_by] || 0) + Number(row.amount || 0);
      }
      return totals;
    },
    enabled: !!householdId && !!month,
    staleTime: 1000 * 30,
  });
};