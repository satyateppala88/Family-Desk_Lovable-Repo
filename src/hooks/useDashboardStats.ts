import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfDay, endOfDay } from "date-fns";

export const useDashboardStats = (householdId: string | null) => {
  return useQuery({
    queryKey: ["dashboard-stats", householdId],
    queryFn: async () => {
      if (!householdId) throw new Error("No household ID");

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Fetch pending tasks count and top 3 upcoming tasks
      // Use task_status instead of status - exclude completed tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("household_id", householdId)
        .neq("task_status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(3);

      if (tasksError) throw tasksError;

      const { count: pendingTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("household_id", householdId)
        .neq("task_status", "done");

      // Fetch today's meal plan
      const { data: mealPlan, error: mealError } = await supabase
        .from("meal_plans")
        .select(`
          *,
          meal_plan_items(
            *,
            recipes(*)
          )
        `)
        .eq("household_id", householdId)
        .lte("week_start_date", format(today, "yyyy-MM-dd"))
        .order("week_start_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const todayFormatted = format(today, "yyyy-MM-dd");
      const todayMeals = mealPlan?.meal_plan_items?.filter((item: any) => {
        return item.scheduled_date === todayFormatted;
      }) || [];

      // Fetch pantry items count (for grocery widget)
      const { count: pantryCount } = await supabase
        .from("pantry_items")
        .select("*", { count: "exact", head: true })
        .eq("household_id", householdId);

      return {
        tasks: tasks || [],
        pendingTasksCount: pendingTasksCount || 0,
        todayMeals,
        pantryItemsCount: pantryCount || 0,
      };
    },
    enabled: !!householdId,
    staleTime: 30 * 1000, // 30 seconds - reduce API calls
    refetchInterval: 60 * 1000, // Background refresh every minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
