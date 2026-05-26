import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MemberFinanceTotals {
  income: number;
  spent: number;
  saved: number;
}

/**
 * Aggregates transactions for the given month by `paid_by`
 * (falling back to `created_by` for legacy rows).
 * Returns a record of userId → { income, spent, saved }.
 */
export const useMemberContributions = (
  householdId: string | null,
  month: string | null,
) => {
  return useQuery({
    queryKey: ["member-contributions", householdId, month],
    queryFn: async (): Promise<Record<string, MemberFinanceTotals>> => {
      if (!householdId || !month) return {};
      const [y, m] = month.split("-").map(Number);
      const nextMonth =
        m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("created_by, paid_by, amount, type")
        .eq("household_id", householdId)
        .gte("transaction_date", `${month}-01`)
        .lt("transaction_date", `${nextMonth}-01`);
      if (error) throw error;
      const totals: Record<string, MemberFinanceTotals> = {};
      for (const row of data || []) {
        const memberId = (row as any).paid_by || row.created_by;
        if (!memberId) continue;
        if (!totals[memberId]) totals[memberId] = { income: 0, spent: 0, saved: 0 };
        const amt = Number(row.amount || 0);
        if (row.type === "income") totals[memberId].income += amt;
        else if (row.type === "expense") totals[memberId].spent += amt;
        else if (row.type === "savings") totals[memberId].saved += amt;
      }
      return totals;
    },
    enabled: !!householdId && !!month,
    staleTime: 1000 * 30,
  });
};