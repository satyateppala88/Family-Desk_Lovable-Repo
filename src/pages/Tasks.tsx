import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useHousehold } from "@/hooks/useHousehold";
import { useTasks } from "@/hooks/useTasks";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { Task } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Step } from "react-joyride";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tasksTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Tasks! Manage household tasks for you and your family.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='add-task-button']",
    content: "Click here to create a new task. You can set priority, due date, and assign to family members.",
    placement: "bottom",
  },
  {
    target: "[data-tour='task-filters']",
    content: "Filter tasks by status (pending, in progress, completed) or priority level.",
    placement: "bottom",
  },
  {
    target: "[data-tour='task-list']",
    content: "Each task card shows the title, priority, due date, and assignee. Click to edit or mark complete.",
    placement: "top",
  },
  {
    target: ".user-menu",
    content: "Access settings and restart this tour anytime from the User Guide menu.",
    placement: "bottom",
  },
];

const Tasks = () => {
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks(householdId);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  // Feature-specific tour
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("tasks");
  const [runOnboarding, setRunOnboarding] = useState(false);

  // Start tour automatically if user hasn't seen it
  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

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
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(id);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  if (loadingHousehold || isLoading) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />

      <main className="container px-4 sm:px-6 py-3 sm:py-4 pb-24">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">Tasks</h1>
          <Button onClick={handleCreateTask} size="sm" data-tour="add-task-button">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 mb-4" data-tour="task-filters">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:w-[140px]">
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
            <SelectTrigger className="w-full sm:w-[140px]">
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
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No tasks found</p>
            <Button onClick={handleCreateTask} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Task
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 stagger-fade-in" data-tour="task-list">
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

      <MobileNav />

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTask}
        householdId={householdId || ""}
      />

      <OnboardingTour
        run={runOnboarding}
        onComplete={handleOnboardingComplete}
        steps={tasksTourSteps}
        featureName="tasks"
      />
    </div>
  );
};

export default Tasks;
