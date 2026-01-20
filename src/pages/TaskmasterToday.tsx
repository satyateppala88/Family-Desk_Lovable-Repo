import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useHousehold } from "@/hooks/useHousehold";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { QuickTaskInput } from "@/components/taskmaster/QuickTaskInput";
import { ParsedTask } from "@/hooks/useParseTask";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, 
  Check, 
  Play, 
  X, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Folder,
  Sparkles,
  Info
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TaskmasterToday = () => {
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { dailyPlan, isLoading, generatePlan, acceptPlan, removeFromPlan } = useDailyPlan(householdId);
  const { markTaskDone, startTask, createTask } = useTaskmaster(householdId);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleQuickCreate = (parsed: ParsedTask) => {
    createTask.mutate({
      title: parsed.title,
      description: parsed.description,
      task_category: parsed.task_category,
      priority_level: parsed.priority_level,
      due_date: parsed.due_date,
      household_id: householdId!,
    });
  };

  // Auto-generate plan on first load if none exists
  useEffect(() => {
    if (householdId && !isLoading && !dailyPlan && !hasGenerated) {
      setHasGenerated(true);
      generatePlan.mutate({});
    }
  }, [householdId, isLoading, dailyPlan, hasGenerated]);

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
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 sm:px-6 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Today's Plan</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generatePlan.mutate({ forceRegenerate: true })}
              disabled={generatePlan.isPending}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", generatePlan.isPending && "animate-spin")} />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Quick Task Input */}
        <div className="mb-6">
          <QuickTaskInput onCreateTask={handleQuickCreate} />
        </div>

        {/* Plan Status Banner */}
        {dailyPlan && (
          <Card className={cn(
            "mb-6",
            dailyPlan.accepted ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" : "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
          )}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dailyPlan.accepted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="font-medium">
                    {dailyPlan.accepted ? "Plan Accepted" : "AI-Generated Draft"}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    ({dailyPlan.items?.length || 0} tasks prioritized)
                  </span>
                </div>
                {!dailyPlan.accepted && (
                  <Button
                    size="sm"
                    onClick={() => acceptPlan.mutate()}
                    disabled={acceptPlan.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accept Plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task List */}
        {dailyPlan?.items && dailyPlan.items.length > 0 ? (
          <div className="space-y-4">
            {dailyPlan.items.map((item: any) => {
              const task = item.task;
              if (!task) return null;

              const priority = getPriorityLabel(task.priority_level || 3);
              const status = getStatusBadge(task.task_status);
              const ageDays = getAgeDays(task.created_at);
              const isDone = task.task_status === "done";

              return (
                <Card key={item.id} className={cn(isDone && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          {task.project && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Folder className="w-3 h-3" />
                              {task.project.name}
                            </div>
                          )}
                        </div>
                        
                        <h3 className={cn(
                          "font-semibold text-base mb-1",
                          isDone && "line-through text-muted-foreground"
                        )}>
                          {task.title}
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
                          {item.ai_reasoning && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs cursor-help">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Why?
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                  <p className="text-sm">{item.ai_reasoning}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>

                      {!isDone && (
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromPlan.mutate(task.id)}
                            disabled={removeFromPlan.isPending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No tasks in today's plan</p>
              <Button 
                onClick={() => generatePlan.mutate({ forceRegenerate: true })}
                disabled={generatePlan.isPending}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", generatePlan.isPending && "animate-spin")} />
                Generate Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <MobileNav />
    </div>
  );
};

export default TaskmasterToday;
