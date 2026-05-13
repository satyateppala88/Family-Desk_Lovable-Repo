import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskmasterTask, TaskAssignee, TaskStatus } from "@/types/taskmaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const useTaskmaster = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["taskmaster-tasks", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(*)
        `)
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch assignees for all tasks
      const taskIds = data.map((t: any) => t.id);
      let assignees: any[] = [];
      if (taskIds.length > 0) {
        const { data: assigneeData } = await supabase
          .from("task_assignees")
          .select("*")
          .in("task_id", taskIds);
        assignees = assigneeData || [];
      }

      // Map assignees to tasks
      return data.map((task: any) => ({
        ...task,
        assignees: assignees?.filter((a: any) => a.task_id === task.id) || [],
      })) as TaskmasterTask[];
    },
    enabled: !!householdId,
    staleTime: 30 * 1000,
  });

  const createTask = useMutation({
    mutationFn: async (newTask: Partial<TaskmasterTask> & { assignee_ids?: string[] }) => {
      const {
        assignee_ids,
        assignees: _ignoredAssignees,
        project: _ignoredProject,
        ...taskData
      } = newTask as Partial<TaskmasterTask> & { assignee_ids?: string[] };

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...taskData,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Add assignees if provided
      if (assignee_ids && assignee_ids.length > 0) {
        const assigneeRows = assignee_ids.map((userId) => ({
          task_id: data.id,
          user_id: userId,
        }));
        await supabase.from("task_assignees").insert(assigneeRows);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      toast({
        title: "Task created",
        description: "Your task has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates, assignee_ids }: { id: string; updates: Partial<TaskmasterTask>; assignee_ids?: string[] }) => {
      // Strip fields that don't exist on the tasks table (e.g. assignee_ids,
      // assignees join data) so PostgREST doesn't reject the update.
      const {
        assignee_ids: _ignoredAssigneeIds,
        assignees: _ignoredAssignees,
        project: _ignoredProject,
        ...safeUpdates
      } = updates as Partial<TaskmasterTask> & { assignee_ids?: string[] };

      const { data, error } = await supabase
        .from("tasks")
        .update(safeUpdates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update assignees if provided
      if (assignee_ids !== undefined) {
        // Delete existing assignees
        await supabase.from("task_assignees").delete().eq("task_id", id);
        
        // Add new assignees
        if (assignee_ids.length > 0) {
          const assigneeRows = assignee_ids.map((userId) => ({
            task_id: id,
            user_id: userId,
          }));
          await supabase.from("task_assignees").insert(assigneeRows);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markTaskDone = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          task_status: 'done' as TaskStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
      toast({
        title: "Task completed",
        description: "Great job!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startTask = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          task_status: 'in_progress' as TaskStatus,
          started_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
      toast({
        title: "Task started",
        description: "Let's get it done!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tasks: tasks || [],
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    markTaskDone,
    startTask,
  };
};
