import { Task } from "@/types/database";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const statusColors = {
  pending: "text-muted-foreground",
  in_progress: "text-blue-500",
  completed: "text-green-500",
};

export const TaskCard = ({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) => {
  const isCompleted = task.status === 'completed';

  const handleToggleComplete = () => {
    onStatusChange(task.id, isCompleted ? 'pending' : 'completed');
  };

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", isCompleted && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggleComplete}
            className="mt-0.5 focus:outline-none"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-medium", isCompleted && "line-through")}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {task.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                Edit
              </DropdownMenuItem>
              {task.status !== 'in_progress' && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
                  Mark In Progress
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(task.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("capitalize", statusColors[task.status])}>
            {task.status.replace('_', ' ')}
          </Badge>
          
          <div className={cn("w-2 h-2 rounded-full", priorityColors[task.priority])} />
          <span className="text-xs text-muted-foreground capitalize">{task.priority}</span>
          
          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
