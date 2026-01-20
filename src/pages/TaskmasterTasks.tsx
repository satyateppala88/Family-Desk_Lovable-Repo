import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { useHousehold } from "@/hooks/useHousehold";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useProjects } from "@/hooks/useProjects";
import { TaskmasterTaskDialog } from "@/components/taskmaster/TaskmasterTaskDialog";
import { QuickTaskInput } from "@/components/taskmaster/QuickTaskInput";
import { ParsedTask } from "@/hooks/useParseTask";
import { TaskmasterTask, TaskStatus, TaskCategory } from "@/types/taskmaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Filter, 
  Search,
  Folder,
  Calendar,
  Clock,
  MoreHorizontal,
  Play,
  Check,
  Trash2,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const TaskmasterTasks = () => {
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { tasks, isLoading, createTask, updateTask, deleteTask, markTaskDone, startTask } = useTaskmaster(householdId);
  const { projects } = useProjects(householdId);
  
  const [selectedTask, setSelectedTask] = useState<TaskmasterTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

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
      case "done": return { label: "Done", variant: "outline" as const };
      default: return { label: "Backlog", variant: "outline" as const };
    }
  };

  const getAgeDays = (createdAt: string) => {
    return differenceInDays(new Date(), new Date(createdAt));
  };

  const filteredTasks = tasks.filter((task: any) => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== "all" && task.task_status !== statusFilter) return false;
    if (categoryFilter !== "all" && task.task_category !== categoryFilter) return false;
    if (projectFilter !== "all" && task.project_id !== projectFilter) return false;
    if (priorityFilter !== "all" && task.priority_level?.toString() !== priorityFilter) return false;
    return true;
  });

  const handleCreateTask = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

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
      });
    }
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(id);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === 'done') {
      markTaskDone.mutate(taskId);
    } else if (newStatus === 'in_progress') {
      startTask.mutate(taskId);
    } else {
      updateTask.mutate({ id: taskId, updates: { task_status: newStatus } as any });
    }
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
          <h1 className="text-xl sm:text-2xl font-bold">All Tasks</h1>
          <Button onClick={handleCreateTask} size="sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>

        {/* Quick Task Input */}
        <div className="mb-6">
          <QuickTaskInput onCreateTask={handleQuickCreate} />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="kid">Kid</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="1">P1 (Highest)</SelectItem>
                <SelectItem value="2">P2</SelectItem>
                <SelectItem value="3">P3</SelectItem>
                <SelectItem value="4">P4 (Lowest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tasks Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Age</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No tasks found</p>
                      <Button onClick={handleCreateTask} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task: any) => {
                    const priority = getPriorityLabel(task.priority_level || 3);
                    const status = getStatusBadge(task.task_status || 'backlog');
                    const ageDays = getAgeDays(task.created_at);
                    const isDone = task.task_status === "done";

                    return (
                      <TableRow key={task.id} className={cn(isDone && "opacity-60")}>
                        <TableCell>
                          <div className={cn(isDone && "line-through")}>
                            {task.title}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {task.project ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Folder className="w-3 h-3" />
                              {task.project.name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">
                            {task.task_category || 'other'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", priority.color)}>
                            {priority.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {task.due_date ? (
                            <span className="text-sm">
                              {format(new Date(task.due_date), "MMM d")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {ageDays}d
                          </span>
                        </TableCell>
                        <TableCell>
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
                              {!isDone && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                                    <Play className="w-4 h-4 mr-2" />
                                    Start
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'done')}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Mark Done
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <MobileNav />

      <TaskmasterTaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTask}
        householdId={householdId || ""}
        projects={projects}
      />
    </div>
  );
};

export default TaskmasterTasks;
