import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, addMonths, startOfMonth } from "date-fns";

export interface MonthlyAggregate {
  month: string; // YYYY-MM
  label: string; // "Jun"
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number; // %
  byCategory: Record<string, number>;
  count: number;
}

/**
 * Aggregates the last `monthsBack` months of transactions client-side.
 * One query, bounded by date — well under the 1000-row limit for typical
 * households. Returns oldest → newest.
 */
export const useFinanceTrends = (
  householdId: string | null,
  monthsBack = 6
) => {
  return useQuery({
    queryKey: ["finance-trends", householdId, monthsBack],
    queryFn: async () => {
      const today = new Date();
      const start = startOfMonth(addMonths(today, -(monthsBack - 1)));
      const startStr = format(start, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("finance_transactions")
        .select("amount,type,category,transaction_date")
        .eq("household_id", householdId!)
        .gte("transaction_date", startStr)
        .order("transaction_date", { ascending: true })
        .limit(2000);
      if (error) throw error;

      // Build empty months
      const buckets: MonthlyAggregate[] = [];
      for (let i = 0; i < monthsBack; i++) {
        const d = addMonths(start, i);
        buckets.push({
          month: format(d, "yyyy-MM"),
          label: format(d, "MMM"),
          income: 0,
          expenses: 0,
          savings: 0,
          savingsRate: 0,
          byCategory: {},
          count: 0,
        });
      }
      const byKey = new Map(buckets.map((b) => [b.month, b]));

      for (const row of (data || []) as Array<{
        amount: number | string;
        type: "income" | "expense";
        category: string;
        transaction_date: string;
      }>) {
        const key = row.transaction_date.slice(0, 7);
        const bucket = byKey.get(key);
        if (!bucket) continue;
        const amt = Number(row.amount);
        if (row.type === "income") bucket.income += amt;
        else {
          bucket.expenses += amt;
          bucket.byCategory[row.category] = (bucket.byCategory[row.category] || 0) + amt;
        }
        bucket.count += 1;
      }
      for (const b of buckets) {
        b.savings = b.income - b.expenses;
        b.savingsRate = b.income > 0 ? Math.round(((b.income - b.expenses) / b.income) * 100) : 0;
      }
      return buckets;
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
};

export interface DailySpend {
  day: number;
  date: string;
  amount: number;
  isWeekend: boolean;
}

/** Per-day expense totals for a single month. */
export const useDailySpend = (householdId: string | null, month: string) => {
  return useQuery({
    queryKey: ["finance-daily-spend", householdId, month],
    queryFn: async () => {
      const [y, m] = month.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("amount,type,transaction_date")
        .eq("household_id", householdId!)
        .eq("type", "expense")
        .gte("transaction_date", `${month}-01`)
        .lt("transaction_date", `${next}-01`);
      if (error) throw error;

      const daysInMonth = new Date(y, m, 0).getDate();
      const result: DailySpend[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m - 1, d);
        result.push({
          day: d,
          date: format(dt, "yyyy-MM-dd"),
          amount: 0,
          isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
        });
      }
      for (const row of (data || []) as Array<{ amount: number | string; transaction_date: string }>) {
        const day = Number(row.transaction_date.slice(8, 10));
        if (result[day - 1]) result[day - 1].amount += Number(row.amount);
      }
      return result;
    },
    enabled: !!householdId && !!month,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });
};