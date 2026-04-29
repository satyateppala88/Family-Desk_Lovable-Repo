import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";

import { useHousehold } from "@/hooks/useHousehold";
import { useProjects } from "@/hooks/useProjects";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { TaskmasterSubNav } from "@/components/taskmaster/TaskmasterSubNav";
import { ProjectDialog } from "@/components/taskmaster/ProjectDialog";
import { Project, ProjectStatus, ProjectType } from "@/types/taskmaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Folder, 
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Home,
  Briefcase,
  User,
  HelpCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const TaskmasterProjects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects(householdId);
  const { tasks } = useTaskmaster(householdId);

  useRealtimeSubscription([
    {
      table: "projects",
      filter: householdId ? `household_id=eq.${householdId}` : undefined,
      queryKeys: [["projects", householdId]],
      enabled: !!householdId,
    },
    {
      table: "tasks",
      filter: householdId ? `household_id=eq.${householdId}` : undefined,
      queryKeys: [["taskmaster-tasks", householdId]],
      enabled: !!householdId,
    },
  ]);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const getTypeIcon = (type: ProjectType) => {
    switch (type) {
      case "home": return <Home className="w-4 h-4" />;
      case "work": return <Briefcase className="w-4 h-4" />;
      case "personal": return <User className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "in_progress": return { label: "In Progress", variant: "default" as const };
      case "blocked": return { label: "Blocked", variant: "destructive" as const };
      case "done": return { label: "Done", variant: "outline" as const };
      default: return { label: "Planning", variant: "secondary" as const };
    }
  };

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter((t: any) => t.project_id === projectId);
    const totalTasks = projectTasks.length;
    const doneTasks = projectTasks.filter((t: any) => t.task_status === "done").length;
    const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return { totalTasks, doneTasks, completionPercent };
  };

  const filteredProjects = projects.filter((project) => {
    if (statusFilter !== "all" && project.status !== statusFilter) return false;
    if (typeFilter !== "all" && project.type !== typeFilter) return false;
    return true;
  });

  const handleCreateProject = () => {
    setSelectedProject(null);
    setDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };

  const handleSaveProject = (projectData: Partial<Project>) => {
    if (selectedProject) {
      updateProject.mutate({ 
        id: selectedProject.id, 
        updates: projectData 
      });
    } else {
      createProject.mutate({
        ...projectData,
        household_id: householdId!,
        created_by: user?.id!,
      });
    }
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Are you sure you want to delete this project? Tasks will be unassigned from it.")) {
      deleteProject.mutate(id);
    }
  };

  if (loadingHousehold || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 sm:px-6 py-6 pb-24">
        <TaskmasterSubNav />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mt-4">Projects</h1>
          <Button onClick={handleCreateProject} size="sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">New Project</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No projects found</p>
              <Button onClick={handleCreateProject} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const status = getStatusBadge(project.status);
              const stats = getProjectStats(project.id);
              const isDone = project.status === "done";

              return (
                <Card 
                  key={project.id} 
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-shadow",
                    isDone && "opacity-60"
                  )}
                  onClick={() => navigate(`/taskmaster/projects/${project.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(project.type)}
                        <CardTitle className="text-base line-clamp-1">
                          {project.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {project.type}
                      </Badge>
                      {project.target_date && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(project.target_date), "MMM d")}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {stats.doneTasks}/{stats.totalTasks} tasks
                        </span>
                        <span className="font-medium">{stats.completionPercent}%</span>
                      </div>
                      <Progress value={stats.completionPercent} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      

      <ProjectDialog
        project={selectedProject}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveProject}
      />
    </div>
  );
};

export default TaskmasterProjects;
