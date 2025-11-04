import { Task } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
}

export const TaskCard = ({ task, onComplete, onDelete, onClick }: TaskCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusIcon = () => {
    if (task.status === "completed") {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (task.due_date && new Date(task.due_date) < new Date()) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <Clock className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        task.status === "completed" && "opacity-60"
      )}
      onClick={() => onClick(task)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <h3
                className={cn(
                  "font-semibold truncate text-sm sm:text-base",
                  task.status === "completed" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </h3>
            </div>

            {task.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>

              {task.due_date && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(task.due_date), "MMM d")}
                </Badge>
              )}

              <Badge variant="outline" className="text-xs capitalize">
                {task.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:gap-2">
            {task.status !== "completed" && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task.id);
                }}
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
