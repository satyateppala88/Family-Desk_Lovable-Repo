import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TaskCategory, TaskStatus } from "@/types/taskmaster";

export interface ParsedTask {
  title: string;
  description: string | null;
  task_category: TaskCategory;
  priority_level: number;
  due_date: string | null;
  task_status: TaskStatus | null;
}

export const useParseTask = () => {
  const { toast } = useToast();

  const parseTask = useMutation({
    mutationFn: async (input: string): Promise<ParsedTask> => {
      const { data, error } = await supabase.functions.invoke("parse-task-input", {
        body: { input }
      });

      if (error) throw error;
      
      if (!data?.success || !data?.task) {
        throw new Error(data?.error || "Failed to parse task");
      }

      return data.task as ParsedTask;
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to understand your input";
      toast({
        title: "Parsing failed",
        description: message,
        variant: "destructive",
      });
    }
  });

  return { parseTask };
};
