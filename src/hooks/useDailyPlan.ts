import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DailyPlan, DailyPlanItem, DailyPlanWithItems } from "@/types/taskmaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { STALE } from "@/lib/query-constants";

export const useDailyPlan = (householdId: string | null, date?: Date) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, session } = useAuth();
  const targetDate = date || new Date();
  const dateString = format(targetDate, "yyyy-MM-dd");

  const { data: dailyPlan, isLoading, refetch } = useQuery({
    queryKey: ["daily-plan", householdId, dateString, user?.id],
    queryFn: async () => {
      if (!householdId || !user?.id) return null;

      // First check if a plan exists
      const { data: plan, error } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("household_id", householdId)
        .eq("user_id", user.id)
        .eq("date", dateString)
        .maybeSingle();

      if (error) throw error;
      if (!plan) return null;

      // Fetch plan items with task details
      const { data: items, error: itemsError } = await supabase
        .from("daily_plan_items")
        .select(`
          *,
          task:tasks(
            *,
            project:projects(*)
          )
        `)
        .eq("daily_plan_id", plan.id)
        .order("position", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...plan,
        items: items || [],
      } as DailyPlanWithItems;
    },
    enabled: !!householdId && !!user?.id,
    staleTime: STALE.SHORT,
  });

  const extractCalendarTasks = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error("Not authenticated");
      
      const response = await supabase.functions.invoke("extract-calendar-tasks", {
        body: { date: dateString, householdId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks"] });
      if (data.tasksCreated > 0) {
        toast({
          title: "Tasks extracted",
          description: `Found ${data.tasksCreated} tasks from your calendar.`,
        });
      }
    },
    onError: (error: any) => {
      console.error("Calendar extraction error:", error);
      // Silent fail - don't interrupt daily plan generation
    },
  });

  const generatePlan = useMutation({
    mutationFn: async ({ forceRegenerate = false }: { forceRegenerate?: boolean } = {}) => {
      if (!session?.access_token) throw new Error("Not authenticated");
      
      // First extract any calendar tasks (silent operation)
      try {
        await supabase.functions.invoke("extract-calendar-tasks", {
          body: { date: dateString, householdId },
        });
      } catch (e) {
        console.log("Calendar extraction skipped:", e);
      }
      
      const response = await supabase.functions.invoke("generate-daily-plan", {
        body: { date: dateString, forceRegenerate, householdId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-plan", householdId, dateString, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks"] });
      toast({
        title: "Plan generated",
        description: "Your daily plan has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating plan",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const acceptPlan = useMutation({
    mutationFn: async () => {
      if (!dailyPlan?.id) throw new Error("No plan to accept");

      const { error } = await supabase
        .from("daily_plans")
        .update({
          accepted: true,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", dailyPlan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-plan", householdId, dateString, user?.id] });
      toast({
        title: "Plan accepted",
        description: "Your daily plan has been confirmed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeFromPlan = useMutation({
    mutationFn: async (taskId: string) => {
      if (!dailyPlan?.id) throw new Error("No plan");

      const { error } = await supabase
        .from("daily_plan_items")
        .delete()
        .eq("daily_plan_id", dailyPlan.id)
        .eq("task_id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-plan", householdId, dateString, user?.id] });
      toast({
        title: "Task removed",
        description: "Task removed from today's plan.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    dailyPlan,
    isLoading,
    refetch,
    generatePlan,
    acceptPlan,
    removeFromPlan,
    extractCalendarTasks,
  };
};
