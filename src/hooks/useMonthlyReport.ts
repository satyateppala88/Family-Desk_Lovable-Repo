import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceMonthlySummary, CATEGORY_LABELS, CATEGORY_ALIASES } from "@/hooks/useFinance";
import { format, parse, addMonths, startOfMonth, endOfMonth, getDay, eachDayOfInterval } from "date-fns";

export interface MonthlyReportData {
  householdName: string | null;
  month: string; // yyyy-MM
  monthLabel: string;
  spent: number;
  saved: number;
  topCategories: { key: string; label: string; amount: number }[];
  habits: { completed: number; total: number; percent: number; bestStreak: number };
  mealsCooked: number;
  tasksCompleted: number;
}

const labelFor = (key: string) => {
  const resolved = CATEGORY_ALIASES[key] || key;
  return CATEGORY_LABELS[resolved] || resolved.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export const useMonthlyReport = (month: string) => {
  const { householdId, householdName } = useHousehold();
  const { data: summary } = useFinanceMonthlySummary(householdId, month);

  return useQuery({
    queryKey: ["monthly-report", householdId, month, summary?.expenses, summary?.income],
    enabled: !!householdId && !!summary,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<MonthlyReportData> => {
      const start = startOfMonth(parse(month + "-01", "yyyy-MM-dd", new Date()));
      const end = endOfMonth(start);
      const startISO = format(start, "yyyy-MM-dd");
      const endISO = format(end, "yyyy-MM-dd");
      const nextMonthStart = format(addMonths(start, 1), "yyyy-MM-dd");
      const monthLabel = format(start, "MMMM yyyy");

      // Top 3 categories
      const cats = Object.entries(summary?.categoryBreakdown || {})
        .map(([k, v]) => ({ key: k, label: labelFor(k), amount: Number(v) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      // ── Habits
      const { data: habits } = await supabase
        .from("habits")
        .select("id, frequency_type, frequency_days, created_at, is_active")
        .eq("household_id", householdId!);
      const habitIds = (habits || []).map((h) => h.id);

      let completedCount = 0;
      let scheduledCount = 0;
      let bestStreak = 0;

      if (habitIds.length > 0) {
        const { data: logs } = await supabase
          .from("habit_logs")
          .select("habit_id, log_date, completed")
          .in("habit_id", habitIds)
          .gte("log_date", startISO)
          .lte("log_date", endISO);
        completedCount = (logs || []).filter((l) => l.completed).length;

        // Estimate scheduled: for each habit, count eligible days in the month (capped to month range and habit creation date)
        const days = eachDayOfInterval({ start, end });
        for (const h of habits || []) {
          const habitStart = h.created_at ? new Date(h.created_at) : start;
          const eligible = days.filter((d) => d >= habitStart);
          if (h.frequency_type === "daily") {
            scheduledCount += eligible.length;
          } else if (h.frequency_type === "weekly") {
            scheduledCount += Math.max(1, Math.floor(eligible.length / 7));
          } else if (h.frequency_type === "specific_days") {
            const fdays = h.frequency_days || [];
            scheduledCount += eligible.filter((d) => fdays.includes(getDay(d))).length;
          } else {
            scheduledCount += eligible.length;
          }
        }

        const { data: streaks } = await supabase
          .from("habit_streaks")
          .select("longest_streak")
          .in("habit_id", habitIds);
        bestStreak = (streaks || []).reduce((m, s) => Math.max(m, s.longest_streak || 0), 0);
      }

      const percent = scheduledCount > 0 ? Math.min(100, Math.round((completedCount / scheduledCount) * 100)) : 0;

      // ── Meals cooked at home (distinct days)
      const { data: cookedItems } = await supabase
        .from("meal_plan_items")
        .select("scheduled_date, cooked_at, meal_plans!inner(household_id)")
        .eq("meal_plans.household_id", householdId!)
        .not("cooked_at", "is", null)
        .gte("cooked_at", start.toISOString())
        .lt("cooked_at", addMonths(start, 1).toISOString());
      const cookedDays = new Set(
        (cookedItems || [])
          .map((m: any) => m.scheduled_date || (m.cooked_at ? String(m.cooked_at).slice(0, 10) : null))
          .filter(Boolean)
      );
      const mealsCooked = cookedDays.size;

      // ── Tasks completed
      const { count: tasksCompleted } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId!)
        .eq("status", "completed")
        .gte("completed_at", start.toISOString())
        .lt("completed_at", nextMonthStart);

      return {
        householdName,
        month,
        monthLabel,
        spent: summary?.expenses || 0,
        saved: (summary?.income || 0) - (summary?.expenses || 0),
        topCategories: cats,
        habits: { completed: completedCount, total: scheduledCount, percent, bestStreak },
        mealsCooked,
        tasksCompleted: tasksCompleted || 0,
      };
    },
  });
};