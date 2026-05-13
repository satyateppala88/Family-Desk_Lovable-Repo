import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskmasterTask, TaskAssignee, TaskStatus } from "@/types/taskmaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cloneTaskAsNextOccurrence, type RecurrencePattern } from "@/lib/recurrence";
import { format } from "date-fns";

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
        title: "Something went wrong",
        description: "Please try again.",
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
        title: "Something went wrong",
        description: "Please try again.",
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
        title: "Something went wrong",
        description: "Please try again.",
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

      // Auto-generate next occurrence if recurring
      let nextDueLabel: string | null = null;
      try {
        const next = cloneTaskAsNextOccurrence(data as any);
        if (next) {
          const { data: created } = await supabase
            .from("tasks")
            .insert(next as any)
            .select()
            .single();
          if (created?.id) {
            // Copy assignees
            const { data: existingAssignees } = await supabase
              .from("task_assignees")
              .select("user_id")
              .eq("task_id", id);
            if (existingAssignees && existingAssignees.length > 0) {
              await supabase.from("task_assignees").insert(
                existingAssignees.map((a: any) => ({
                  task_id: created.id,
                  user_id: a.user_id,
                }))
              );
            }
            if (created.due_date) {
              nextDueLabel = format(new Date(created.due_date), "PPP");
            }
          }
        }
      } catch (e) {
        console.error("Failed to clone recurring task", e);
      }

      return { ...data, _nextDueLabel: nextDueLabel };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["daily-plan"] });
      toast({
        title: "Task completed",
        description: result?._nextDueLabel
          ? `Next one scheduled for ${result._nextDueLabel}.`
          : "Great job!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkCreateFromTemplate = useMutation({
    mutationFn: async ({
      projectName,
      items,
    }: {
      projectName: string;
      items: Array<{
        title: string;
        task_category?: string;
        priority_level?: number;
        due_date?: string | null;
        recurring?: boolean;
        recurring_pattern?: RecurrencePattern | null;
      }>;
    }) => {
      if (!householdId) throw new Error("No household");

      const { data: project, error: projErr } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          household_id: householdId,
          type: "home",
          status: "in_progress",
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (projErr) throw projErr;

      const rows = items.map((it) => ({
        title: it.title,
        task_category: (it.task_category as any) ?? "other",
        priority_level: it.priority_level ?? 3,
        task_status: "backlog" as TaskStatus,
        due_date: it.due_date ?? null,
        recurring: !!it.recurring,
        recurring_pattern: (it.recurring_pattern as any) ?? null,
        household_id: householdId,
        project_id: project.id,
        created_by: user?.id,
      }));

      const { data: tasksData, error: tasksErr } = await supabase
        .from("tasks")
        .insert(rows as any)
        .select();
      if (tasksErr) throw tasksErr;

      // Assign to current user
      if (user?.id && tasksData && tasksData.length > 0) {
        await supabase.from("task_assignees").insert(
          tasksData.map((t: any) => ({ task_id: t.id, user_id: user.id }))
        );
      }

      return { project, count: tasksData?.length ?? 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["taskmaster-tasks", householdId] });
      queryClient.invalidateQueries({ queryKey: ["projects", householdId] });
      toast({
        title: "Template applied",
        description: `${result.count} tasks added to ${result.project.name}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
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
        title: "Something went wrong",
        description: "Please try again.",
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
    bulkCreateFromTemplate,
  };
};
