import { useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useHousehold } from "@/hooks/useHousehold";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ListTodo,
  Folder,
  Calendar
} from "lucide-react";
import { differenceInDays, subDays, isAfter, format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const TaskmasterDashboard = () => {
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { tasks, isLoading: loadingTasks } = useTaskmaster(householdId);
  const { projects, isLoading: loadingProjects } = useProjects(householdId);

  const stats = useMemo(() => {
    if (!tasks) return null;

    const now = new Date();
    const weekAgo = subDays(now, 7);

    const openStatuses = ["backlog", "today", "in_progress", "blocked"];
    const openTasks = tasks.filter((t) => openStatuses.includes(t.task_status || ""));
    const doneTasks = tasks.filter((t) => t.task_status === "done");
    const doneThisWeek = doneTasks.filter((t) => 
      t.completed_at && isAfter(new Date(t.completed_at), weekAgo)
    );

    // Average age of open tasks
    const totalAgeDays = openTasks.reduce((sum, t) => {
      return sum + differenceInDays(now, new Date(t.created_at));
    }, 0);
    const avgAge = openTasks.length > 0 ? Math.round(totalAgeDays / openTasks.length) : 0;

    // Tasks by priority
    const byPriority = {
      P1: openTasks.filter((t) => t.priority_level === 1).length,
      P2: openTasks.filter((t) => t.priority_level === 2).length,
      P3: openTasks.filter((t) => t.priority_level === 3 || !t.priority_level).length,
      P4: openTasks.filter((t) => t.priority_level === 4).length,
    };

    // Tasks by category
    const byCategory = {
      Home: openTasks.filter((t) => t.task_category === "home").length,
      Work: openTasks.filter((t) => t.task_category === "work").length,
      Kid: openTasks.filter((t) => t.task_category === "kid").length,
      Other: openTasks.filter((t) => t.task_category === "other" || !t.task_category).length,
    };

    // Oldest open tasks
    const oldestTasks = [...openTasks]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);

    // Stuck tasks (not updated in a long time)
    const stuckTasks = [...openTasks]
      .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      .slice(0, 5);

    return {
      total: tasks.length,
      open: openTasks.length,
      done: doneTasks.length,
      doneThisWeek: doneThisWeek.length,
      avgAge,
      byPriority,
      byCategory,
      oldestTasks,
      stuckTasks,
    };
  }, [tasks]);

  const priorityChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "P1", value: stats.byPriority.P1, fill: "hsl(0, 84%, 60%)" },
      { name: "P2", value: stats.byPriority.P2, fill: "hsl(25, 95%, 53%)" },
      { name: "P3", value: stats.byPriority.P3, fill: "hsl(48, 96%, 53%)" },
      { name: "P4", value: stats.byPriority.P4, fill: "hsl(217, 91%, 60%)" },
    ];
  }, [stats]);

  const categoryChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Home", value: stats.byCategory.Home, fill: "hsl(142, 76%, 36%)" },
      { name: "Work", value: stats.byCategory.Work, fill: "hsl(221, 83%, 53%)" },
      { name: "Kid", value: stats.byCategory.Kid, fill: "hsl(330, 81%, 60%)" },
      { name: "Other", value: stats.byCategory.Other, fill: "hsl(240, 5%, 64%)" },
    ];
  }, [stats]);

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

  const getStuckDays = (updatedAt: string) => {
    return differenceInDays(new Date(), new Date(updatedAt));
  };

  const isLoading = loadingHousehold || loadingTasks || loadingProjects;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
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
        <div className="flex items-center gap-2 mb-6">
          <LayoutDashboard className="w-6 h-6" />
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ListTodo className="w-4 h-4" />
                <span className="text-xs">Total Tasks</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Open Tasks</span>
              </div>
              <p className="text-2xl font-bold">{stats?.open || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">Done This Week</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stats?.doneThisWeek || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Avg. Age (days)</span>
              </div>
              <p className="text-2xl font-bold">{stats?.avgAge || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px]">
                <BarChart data={priorityChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={4}>
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open Tasks by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px]">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Oldest Open Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.oldestTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open tasks</p>
              ) : (
                <div className="space-y-3">
                  {stats?.oldestTasks.map((task) => {
                    const priority = getPriorityLabel(task.priority_level || 3);
                    const ageDays = getAgeDays(task.created_at);

                    return (
                      <div key={task.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("text-xs", priority.color)}>
                              {priority.label}
                            </Badge>
                            {task.project && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {task.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {ageDays}d old
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Stuck Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.stuckTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stuck tasks</p>
              ) : (
                <div className="space-y-3">
                  {stats?.stuckTasks.map((task) => {
                    const priority = getPriorityLabel(task.priority_level || 3);
                    const stuckDays = getStuckDays(task.updated_at);

                    return (
                      <div key={task.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("text-xs", priority.color)}>
                              {priority.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {task.task_status}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {stuckDays}d stuck
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects Summary */}
        {projects && projects.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Folder className="w-4 h-4 text-muted-foreground" />
                Projects Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {projects.slice(0, 6).map((project) => {
                  const projectTasks = tasks?.filter((t) => t.project_id === project.id) || [];
                  const doneTasks = projectTasks.filter((t) => t.task_status === "done").length;
                  const totalTasks = projectTasks.length;
                  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                  return (
                    <div key={project.id} className="p-3 rounded-lg border">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {doneTasks}/{totalTasks} tasks
                        </span>
                        <Badge variant={progress === 100 ? "default" : "secondary"}>
                          {progress}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <MobileNav />
    </div>
  );
};

export default TaskmasterDashboard;
