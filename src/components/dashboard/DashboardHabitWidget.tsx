import { Link } from "react-router-dom";
import { Flame, ChevronRight, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useHabits } from "@/hooks/useHabits";
import { cn } from "@/lib/utils";

interface DashboardHabitWidgetProps {
  householdId: string | null;
}

export const DashboardHabitWidget = ({ householdId }: DashboardHabitWidgetProps) => {
  const { todaysHabits, isLoading } = useHabits(householdId);

  const completedCount = todaysHabits.filter((h) => h.todayLog?.completed).length;
  const totalCount = todaysHabits.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Leaf className="h-4 w-4 text-accent" />
            Habits
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{totalCount} today
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No habits yet. Start building healthy routines!
          </p>
        ) : (
          <div className="space-y-2">
            {todaysHabits.slice(0, 3).map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      habit.todayLog?.completed
                        ? "bg-accent"
                        : "border-2 border-muted-foreground/30"
                    )}
                  />
                  <span
                    className={cn(
                      habit.todayLog?.completed &&
                        "line-through text-muted-foreground"
                    )}
                  >
                    {habit.name}
                  </span>
                </div>
                {(habit.streak?.current_streak || 0) >= 3 && (
                  <div className="flex items-center gap-1 text-primary text-xs">
                    <Flame className="h-3 w-3" />
                    {habit.streak?.current_streak}
                  </div>
                )}
              </div>
            ))}
            {totalCount > 3 && (
              <p className="text-xs text-muted-foreground">
                +{totalCount - 3} more habits
              </p>
            )}
          </div>
        )}
        <Link
          to="/habits"
          className="flex items-center justify-end gap-1 text-sm text-primary mt-3 hover:underline"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
};
