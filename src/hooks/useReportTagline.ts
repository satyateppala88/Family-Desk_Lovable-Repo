import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlyReportData } from "./useMonthlyReport";

const FALLBACKS = [
  "Small steps, steady progress — your family showed up this month.",
  "Another month of building good habits together. Keep going!",
  "Money tracked, meals cooked, tasks done — that's a real win.",
  "Consistency over perfection — and you're nailing the consistency.",
];

export const useReportTagline = (
  householdId: string | null,
  month: string,
  report: MonthlyReportData | undefined
) => {
  return useQuery({
    queryKey: ["report-tagline", householdId, month],
    enabled: !!householdId && !!report,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<string> => {
      try {
        const { data, error } = await supabase.functions.invoke("monthly-report-tagline", {
          body: {
            householdId,
            month,
            stats: {
              spent: report!.spent,
              saved: report!.saved,
              habitsPercent: report!.habits.percent,
              bestStreak: report!.habits.bestStreak,
              mealsCooked: report!.mealsCooked,
              tasksCompleted: report!.tasksCompleted,
              topCategory: report!.topCategories[0]?.label || null,
            },
          },
        });
        if (error) throw error;
        const tagline = (data as { tagline?: string })?.tagline?.trim();
        if (tagline) return tagline;
      } catch {
        // fall through
      }
      return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    },
  });
};