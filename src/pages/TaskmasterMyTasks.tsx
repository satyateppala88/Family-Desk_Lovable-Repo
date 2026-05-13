import { useMemo } from "react";
import { Header } from "@/components/layout/Header";

import { useHousehold } from "@/hooks/useHousehold";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { TaskmasterSubNav } from "@/components/taskmaster/TaskmasterSubNav";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  Play, 
  Calendar, 
  Clock, 
  Folder,
  Star,
  ListTodo,
  Repeat as RepeatIcon
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskmasterTask } from "@/types/taskmaster";

const TaskmasterMyTasks = () => {
  const { user } = useAuth();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { tasks, isLoading, markTaskDone, startTask } = useTaskmaster(householdId);
  const { dailyPlan } = useDailyPlan(householdId);

  useRealtimeSubscription([
    {
      table: "tasks",
      filter: householdId ? `household_id=eq.${householdId}` : undefined,
      queryKeys: [["taskmaster-tasks", householdId]],
      enabled: !!householdId,
    },
    {
      table: "task_assignees",
      queryKeys: [["taskmaster-tasks", householdId]],
      enabled: !!householdId,
    },
  ]);

  // Filter tasks assigned to current user
  const myTasks = useMemo(() => {
    if (!user || !tasks) return [];
    return tasks.filter((task) => {
      if (task.task_status === "done") return false;
      return task.assignees?.some((a) => a.user_id === user.id);
    });
  }, [tasks, user]);

  // Get task IDs in today's plan
  const todayTaskIds = useMemo(() => {
    if (!dailyPlan?.items) return new Set<string>();
    return new Set(dailyPlan.items.map((item: any) => item.task_id));
  }, [dailyPlan]);

  // Group by project and sort
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskmasterTask[]> = { "No Project": [] };
    
    myTasks.forEach((task) => {
      const projectName = task.project?.name || "No Project";
      if (!groups[projectName]) {
        groups[projectName] = [];
      }
      groups[projectName].push(task);
    });

    // Sort tasks within each group
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        // Due date ascending (nulls last)
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && b.due_date) {
          const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          if (diff !== 0) return diff;
        }
        // Priority ascending (1 is highest)
        const aPriority = a.priority_level || 3;
        const bPriority = b.priority_level || 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        // Age descending (older first)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    });

    return groups;
  }, [myTasks]);

  const getPriorityLabel = (level: number) => {
    switch (level) {
      case 1: return { label: "P1", color: "bg-red-500 text-white" };
      case 2: return { label: "P2", color: "bg-orange-500 text-white" };
      case 3: return { label: "P3", color: "bg-yellow-500 text-black" };
      case 4: return { label: "P4", color: "bg-blue-500 text-white" };
      default: return { label: "P3", color: "bg-yellow-500 text-black" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress": return { label: "In Progress", variant: "default" as const };
      case "blocked": return { label: "Blocked", variant: "destructive" as const };
      case "today": return { label: "Today", variant: "secondary" as const };
      default: return { label: "Backlog", variant: "outline" as const };
    }
  };

  const getAgeDays = (createdAt: string) => {
    return differenceInDays(new Date(), new Date(createdAt));
  };

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
      </div>
    );
  }

  const projectKeys = Object.keys(groupedTasks).filter(k => groupedTasks[k].length > 0);
  const totalTasks = myTasks.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 sm:px-6 py-6 pb-24">
        <TaskmasterSubNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mt-4">
              <ListTodo className="w-6 h-6" />
              My Tasks
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalTasks} open {totalTasks === 1 ? "task" : "tasks"} assigned to you
            </p>
          </div>
        </div>

        {totalTasks === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No open tasks assigned to you</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {projectKeys.map((projectName) => (
              <div key={projectName}>
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">{projectName}</h2>
                  <Badge variant="secondary">{groupedTasks[projectName].length}</Badge>
                </div>

                <div className="space-y-3">
                  {groupedTasks[projectName].map((task) => {
                    const priority = getPriorityLabel(task.priority_level || 3);
                    const status = getStatusBadge(task.task_status || "backlog");
                    const ageDays = getAgeDays(task.created_at);
                    const isInTodayPlan = todayTaskIds.has(task.id);

                    return (
                      <Card key={task.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {isInTodayPlan && (
                                  <Badge variant="default" className="text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    In Today's Plan
                                  </Badge>
                                )}
                              </div>

                              <h3 className="font-semibold text-base mb-1 flex items-center gap-1.5">
                                <span>{task.title}</span>
                                {(task as any).recurring && (
                                  <RepeatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </h3>

                              {task.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={cn("text-xs", priority.color)}>
                                  {priority.label}
                                </Badge>
                                <Badge variant={status.variant} className="text-xs capitalize">
                                  {status.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {task.task_category}
                                </Badge>
                                {task.due_date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {format(new Date(task.due_date), "MMM d")}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Open {ageDays} days
                                </span>
                              </div>
                            </div>

                            <div className="flex sm:flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => markTaskDone.mutate(task.id)}
                                disabled={markTaskDone.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Done
                              </Button>
                              {task.task_status !== "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startTask.mutate(task.id)}
                                  disabled={startTask.isPending}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Start
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      
    </div>
  );
};

export default TaskmasterMyTasks;
