import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Task } from "@/types/database";

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>('all');
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchHousehold();
    }
  }, [user]);

  useEffect(() => {
    if (householdId) {
      fetchTasks();
      setupRealtimeSubscription();
    }
  }, [householdId]);

  const fetchHousehold = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("household_members")
        .select("household_id")
        .eq("user_id", user?.id)
        .limit(1)
        .single();

      if (error) throw error;
      setHouseholdId(data.household_id);
    } catch (error) {
      console.error("Error fetching household:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .insert({
          ...taskData,
          household_id: householdId,
          created_by: user?.id,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTask = async (taskData: Partial<Task>) => {
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .update(taskData)
        .eq("id", taskData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <Button onClick={() => setIsFormOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        <TaskFilters
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
        />

        {loading ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No tasks found. Create your first task to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onEdit={(task) => {
                  setEditingTask(task);
                  setIsFormOpen(true);
                }}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        initialTask={editingTask}
      />

      <MobileNav />
    </div>
  );
};

export default Tasks;
