import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
}

interface DashboardTaskWidgetProps {
  tasks: Task[];
  pendingCount: number;
}

export const DashboardTaskWidget = ({ tasks, pendingCount }: DashboardTaskWidgetProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <Link to="/tasks" className="block hover:scale-[1.02] transition-transform">
      <Card className="h-full border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-6 w-6 text-primary" />
              <span>Tasks</span>
            </div>
            <Badge variant="secondary">{pendingCount} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending tasks</p>
          ) : (
            <>
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-1 text-sm text-primary font-medium mt-4">
                View all <ArrowRight className="h-4 w-4" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
