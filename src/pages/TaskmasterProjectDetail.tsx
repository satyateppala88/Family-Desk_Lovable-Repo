import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";

import { useHousehold } from "@/hooks/useHousehold";
import { useProjects } from "@/hooks/useProjects";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { TaskmasterTaskDialog } from "@/components/taskmaster/TaskmasterTaskDialog";
import { TaskmasterTask, TaskStatus } from "@/types/taskmaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Plus,
  Calendar,
  Clock,
  Check,
  Play,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TaskmasterProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { projects, isLoading: loadingProjects } = useProjects(householdId);
  const { tasks, createTask, updateTask, deleteTask, markTaskDone, startTask } = useTaskmaster(householdId);

  const [selectedTask, setSelectedTask] = useState<TaskmasterTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const project = projects.find((p) => p.id === id);
  const projectTasks = tasks.filter((t: any) => t.project_id === id);
  const totalTasks = projectTasks.length;
  const doneTasks = projectTasks.filter((t: any) => t.task_status === "done").length;
  const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress": return { label: "In Progress", variant: "default" as const };
      case "blocked": return { label: "Blocked", variant: "destructive" as const };
      case "today": return { label: "Today", variant: "secondary" as const };
      case "done": return { label: "Done", variant: "outline" as const };
      default: return { label: "Backlog", variant: "outline" as const };
    }
  };

  const getPriorityLabel = (level: number) => {
    switch (level) {
      case 1: return { label: "P1", color: "bg-red-500 text-white" };
      case 2: return { label: "P2", color: "bg-orange-500 text-white" };
      case 3: return { label: "P3", color: "bg-yellow-500 text-black" };
      case 4: return { label: "P4", color: "bg-blue-500 text-white" };
      default: return { label: "P3", color: "bg-yellow-500 text-black" };
    }
  };

  const getAgeDays = (createdAt: string) => {
    return differenceInDays(new Date(), new Date(createdAt));
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: TaskmasterTask) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleSaveTask = (taskData: Partial<TaskmasterTask> & { assignee_ids?: string[] }) => {
    if (selectedTask) {
      updateTask.mutate({ 
        id: selectedTask.id, 
        updates: taskData,
        assignee_ids: taskData.assignee_ids 
      });
    } else {
      createTask.mutate({
        ...taskData,
        household_id: householdId!,
        project_id: id,
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(taskId);
    }
  };

  if (loadingHousehold || loadingProjects) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-40 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Button variant="ghost" onClick={() => navigate("/taskmaster/projects")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Project not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 sm:px-6 py-6 pb-24">
        <Button variant="ghost" onClick={() => navigate("/taskmaster/projects")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>

        {/* Project Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{project.type}</Badge>
                <Badge variant="outline" className="capitalize">{project.status.replace('_', ' ')}</Badge>
                {project.target_date && (
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(project.target_date), "MMM d, yyyy")}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {doneTasks} of {totalTasks} tasks completed
                </span>
                <span className="font-medium">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Tasks Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button onClick={handleCreateTask} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {projectTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No tasks in this project</p>
              <Button onClick={handleCreateTask} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projectTasks.map((task: any) => {
              const status = getStatusBadge(task.task_status || 'backlog');
              const priority = getPriorityLabel(task.priority_level || 3);
              const ageDays = getAgeDays(task.created_at);
              const isDone = task.task_status === "done";

              return (
                <Card key={task.id} className={cn(isDone && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-medium mb-1",
                          isDone && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn("text-xs", priority.color)}>
                            {priority.label}
                          </Badge>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {task.task_category || 'other'}
                          </Badge>
                          {task.due_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(task.due_date), "MMM d")}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ageDays}d old
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isDone && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markTaskDone.mutate(task.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            {task.task_status !== "in_progress" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startTask.mutate(task.id)}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTask(task)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>


      <TaskmasterTaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTask}
        householdId={householdId || ""}
        projects={projects}
        defaultProjectId={id}
      />
    </div>
  );
};

export default TaskmasterProjectDetail;
