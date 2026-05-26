import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTodayTaskCount = (householdId: string | null) => {
  return useQuery({
    queryKey: ["today-task-count", householdId],
    queryFn: async () => {
      if (!householdId) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("due_date", today)
        .not("task_status", "in", '("completed","done")');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!householdId,
    staleTime: 30 * 1000,
  });
};