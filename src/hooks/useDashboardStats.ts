import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export const useDashboardStats = (householdId: string | null) => {
  return useQuery({
    queryKey: ["dashboard-stats", householdId],
    queryFn: async () => {
      if (!householdId) throw new Error("No household ID");

      const today = new Date();
      const todayFormatted = format(today, "yyyy-MM-dd");

      const [tasksRes, countRes, mealRes, pantryRes] = await Promise.all([
        supabase.from("tasks").select("*")
          .eq("household_id", householdId).neq("task_status", "done")
          .order("due_date", { ascending: true, nullsFirst: false }).limit(3),
        supabase.from("tasks").select("*", { count: "exact", head: true })
          .eq("household_id", householdId).neq("task_status", "done"),
        supabase.from("meal_plans")
          .select("*, meal_plan_items(*, recipes(*))")
          .eq("household_id", householdId)
          .lte("week_start_date", todayFormatted)
          .order("week_start_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle(),
        supabase.from("pantry_items").select("*", { count: "exact", head: true })
          .eq("household_id", householdId),
      ]);

      if (tasksRes.error) throw tasksRes.error;

      const todayMeals = mealRes.data?.meal_plan_items?.filter(
        (item: any) => item.scheduled_date === todayFormatted
      ) || [];

      return {
        tasks: tasksRes.data || [],
        pendingTasksCount: countRes.count || 0,
        todayMeals,
        pantryItemsCount: pantryRes.count || 0,
      };
    },
    enabled: !!householdId,
    staleTime: 30 * 1000, // 30 seconds - reduce API calls
    refetchInterval: 60 * 1000, // Background refresh every minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
