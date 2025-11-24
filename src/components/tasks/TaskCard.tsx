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
        "cursor-pointer transition-all hover:shadow-md h-full",
        task.status === "completed" && "opacity-60"
      )}
      onClick={() => onClick(task)}
    >
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3
              className={cn(
                "font-semibold text-sm line-clamp-2",
                task.status === "completed" && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>
          </div>

          <div className="flex gap-1 shrink-0">
            {task.status !== "completed" && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task.id);
                }}
                className="h-7 w-7"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-7 w-7 text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-auto">
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
      </CardContent>
    </Card>
  );
};
