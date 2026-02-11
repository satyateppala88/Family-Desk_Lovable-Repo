import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
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
  return (
    <Link to="/tasks" className="block">
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Tasks</span>
            <span className="text-xs font-normal text-muted-foreground">{pendingCount} pending</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending tasks</p>
          ) : (
            <>
              {tasks.map((task) => (
                <div key={task.id} className="flex items-baseline justify-between gap-2">
                  <p className="text-sm truncate flex-1">{task.title}</p>
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(task.due_date), "MMM d")}
                    </span>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">View all →</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
