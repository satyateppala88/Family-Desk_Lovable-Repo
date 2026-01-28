import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Task } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

// Helper function to send task assignment email
async function sendTaskAssignmentEmail(
  assigneeId: string,
  assignerName: string,
  taskTitle: string,
  dueDate: string | null,
  taskId: string
) {
  try {
    // Get assignee name
    const { data: assigneeProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", assigneeId)
      .single();

    // Call edge function to send email
    await supabase.functions.invoke("send-task-notification", {
      body: {
        assigneeId,
        assigneeName: assigneeProfile?.display_name || "Team Member",
        assignerName,
        taskTitle,
        dueDate,
        taskId,
      },
    });
  } catch (error) {
    console.error("Failed to send task assignment email:", error);
  }
}

export const useTasks = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!householdId,
  });

  const createTask = useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", householdId] });
      toast({
        title: "Task created",
        description: "Your task has been added successfully.",
      });

      // Send email if task is assigned to someone
      if (variables.assigned_to) {
        const { data: currentUser } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", currentUser?.user?.id)
          .single();

        sendTaskAssignmentEmail(
          variables.assigned_to,
          profile?.display_name || "A team member",
          variables.title || "New Task",
          variables.due_date || null,
          data.id
        );
      }
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
    mutationFn: async ({ id, updates, previousAssignee }: { id: string; updates: Partial<Task>; previousAssignee?: string | null }) => {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, previousAssignee };
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", householdId] });
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      });

      // Send email if task assignment changed to a new person
      const { data, previousAssignee } = result;
      if (variables.updates.assigned_to && variables.updates.assigned_to !== previousAssignee) {
        const { data: currentUser } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", currentUser?.user?.id)
          .single();

        sendTaskAssignmentEmail(
          variables.updates.assigned_to,
          profile?.display_name || "A team member",
          data.title,
          data.due_date,
          data.id
        );
      }
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
      const { error } = await (supabase as any)
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", householdId] });
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

  return {
    tasks: tasks || [],
    isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
};
