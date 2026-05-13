import { useState } from "react";
import { Task } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Check, Clock, AlertCircle, Trash2, RotateCcw, User } from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
  high: { label: "High", className: "bg-warning/10 text-warning border-warning/20" },
  medium: { label: "Medium", className: "bg-primary/10 text-primary border-primary/20" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
};

const getDueDateLabel = (dueDate: string) => {
  const date = new Date(dueDate);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isPast(date)) {
    const days = differenceInDays(new Date(), date);
    return `${days}d overdue`;
  }
  const days = differenceInDays(date, new Date());
  if (days <= 7) return `${days}d left`;
  return format(date, "MMM d");
};

const getDueDateStyle = (dueDate: string, status: string) => {
  if (status === "completed") return "text-muted-foreground";
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) return "text-destructive font-medium";
  if (isToday(date)) return "text-warning font-medium";
  return "text-muted-foreground";
};

export const TaskCard = ({ task, onComplete, onDelete, onClick }: TaskCardProps) => {
  const isCompleted = task.status === "completed";
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
    <SwipeRow
      radiusClass="rounded-lg"
      disabled={isCompleted}
      actions={[
        {
          key: "done",
          label: "Done",
          icon: <Check className="w-4 h-4" />,
          bgClass: "bg-[hsl(var(--success))]",
          onAction: () => { if (!isCompleted) onComplete(task.id); },
        },
        {
          key: "delete",
          label: "Delete",
          icon: <Trash2 className="w-4 h-4" />,
          bgClass: "bg-destructive",
          onAction: () => setConfirmOpen(true),
        },
      ]}
    >
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md group",
        isCompleted && "opacity-60"
      )}
      onClick={() => onClick(task)}
    >
      <CardContent className="p-4 flex gap-3">
        {/* Completion circle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCompleted) onComplete(task.id);
          }}
          className={cn(
            "mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            isCompleted
              ? "bg-primary border-primary"
              : "border-border hover:border-primary/50"
          )}
          style={{ minHeight: "24px" }}
          aria-label={isCompleted ? "Completed" : "Mark complete"}
        >
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-sm font-semibold leading-snug",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
              style={{ minHeight: "28px" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.className)}>
              {priority.label}
            </Badge>

            {task.due_date && (
              <span className={cn("text-[11px] flex items-center gap-1", getDueDateStyle(task.due_date, task.status))}>
                <Clock className="w-3 h-3" />
                {getDueDateLabel(task.due_date)}
              </span>
            )}

            {task.recurring && (
              <span className="text-[11px] flex items-center gap-0.5 text-muted-foreground">
                <RotateCcw className="w-3 h-3" />
                Recurring
              </span>
            )}

            {task.assigned_to && (
              <span className="text-[11px] flex items-center gap-0.5 text-muted-foreground">
                <User className="w-3 h-3" />
                Assigned
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </SwipeRow>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Delete task?"
      description={`"${task.title}" will be permanently removed.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => { onDelete(task.id); setConfirmOpen(false); }}
    />
    </>
  );
};
