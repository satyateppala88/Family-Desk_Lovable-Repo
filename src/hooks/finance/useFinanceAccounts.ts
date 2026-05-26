import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceAccount } from "./types";

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