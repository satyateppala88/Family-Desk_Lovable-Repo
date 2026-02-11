import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Habits</span>
          <span className="text-xs font-normal text-muted-foreground">
            {completedCount}/{totalCount} today
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No habits yet. Start building healthy routines!
          </p>
        ) : (
          <div className="space-y-2">
            {todaysHabits.slice(0, 3).map((habit) => (
              <div key={habit.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      habit.todayLog?.completed
                        ? "bg-foreground"
                        : "border border-muted-foreground/30"
                    )}
                  />
                  <span className={cn(habit.todayLog?.completed && "line-through text-muted-foreground")}>
                    {habit.name}
                  </span>
                </div>
                {(habit.streak?.current_streak || 0) >= 3 && (
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Flame className="h-3 w-3" />
                    {habit.streak?.current_streak}
                  </div>
                )}
              </div>
            ))}
            {totalCount > 3 && (
              <p className="text-xs text-muted-foreground">+{totalCount - 3} more</p>
            )}
          </div>
        )}
        <Link to="/habits" className="block text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
          View all →
        </Link>
      </CardContent>
    </Card>
  );
};
