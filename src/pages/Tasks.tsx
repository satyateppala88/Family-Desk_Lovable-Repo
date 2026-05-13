import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHousehold } from "@/hooks/useHousehold";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/types/database";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Plus, Filter, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Tasks = () => {
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks(householdId);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (selectedTask) {
      updateTask.mutate({ id: selectedTask.id, updates: taskData });
    } else {
      createTask.mutate(taskData);
    }
  };

  const handleCompleteTask = (id: string) => {
    updateTask.mutate({
      id,
      updates: {
        status: "completed",
        completed_at: new Date().toISOString(),
      },
    });
    toast.success("Well done! Task completed 🎉");
  };

  const handleDeleteTask = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteTask.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  const activeCount = tasks.filter(t => t.status !== "completed").length;

  if (loadingHousehold || isLoading) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <PageLoading cards={4} />
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />

      <main className="page-content">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-heading">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeCount > 0 ? `${activeCount} things to do` : "You're all caught up!"}
            </p>
          </div>
          <Button onClick={handleCreateTask} size="sm" data-tour="add-task-button" className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 mb-4" data-tour="task-filters">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:w-[140px]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={statusFilter !== "all" || priorityFilter !== "all" ? "No matching tasks" : "Nothing on the list yet"}
            description={statusFilter !== "all" || priorityFilter !== "all" ? "Try widening your filters" : "Add a task to get started — it'll be visible to everyone in your household."}
            encouragement={statusFilter === "all" && priorityFilter === "all" ? "Even small wins count. What needs doing?" : undefined}
            action={{ label: "Add a Task", onClick: handleCreateTask }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" data-tour="task-list">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onClick={handleTaskClick}
              />
            ))}
          </div>
        )}
      </main>

      <QuickActionButton
        items={[{ label: "Add Task", icon: Plus, onClick: handleCreateTask }]}
        className="sm:hidden"
      />

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTask}
        householdId={householdId || ""}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete this task?"
        description="This can't be undone. The task will be permanently removed for everyone in the household."
        confirmLabel="Delete Task"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Tasks;
