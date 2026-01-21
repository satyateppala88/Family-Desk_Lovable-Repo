import { Check, Flame, Plus, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HabitWithStreak } from "@/types/habits";

interface HabitCardProps {
  habit: HabitWithStreak;
  onToggle: (habitId: string, completed: boolean) => void;
  onUpdateValue?: (habitId: string, value: number) => void;
}

export const HabitCard = ({ habit, onToggle, onUpdateValue }: HabitCardProps) => {
  const isCompleted = habit.todayLog?.completed || false;
  const currentValue = habit.todayLog?.actual_value || 0;
  const hasTarget = habit.target_value && habit.target_unit;
  const streakCount = habit.streak?.current_streak || 0;

  const handleToggle = () => {
    if (hasTarget) {
      // For trackable habits, complete when target is reached
      const newValue = currentValue + 1;
      onUpdateValue?.(habit.id, newValue);
      if (newValue >= (habit.target_value || 0)) {
        onToggle(habit.id, true);
      }
    } else {
      onToggle(habit.id, !isCompleted);
    }
  };

  const handleIncrement = () => {
    const newValue = currentValue + 1;
    onUpdateValue?.(habit.id, newValue);
    if (newValue >= (habit.target_value || 0)) {
      onToggle(habit.id, true);
    }
  };

  const handleDecrement = () => {
    if (currentValue > 0) {
      const newValue = currentValue - 1;
      onUpdateValue?.(habit.id, newValue);
      if (newValue < (habit.target_value || 0)) {
        onToggle(habit.id, false);
      }
    }
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-200 cursor-pointer hover:shadow-md",
        isCompleted && "bg-accent/30 border-accent"
      )}
      onClick={hasTarget ? undefined : handleToggle}
    >
      <div className="flex items-center gap-4">
        {/* Completion indicator */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!hasTarget) handleToggle();
          }}
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
            isCompleted
              ? "bg-accent border-accent text-accent-foreground"
              : "border-muted-foreground/30 hover:border-accent"
          )}
          style={{
            backgroundColor: isCompleted ? habit.color : undefined,
            borderColor: isCompleted ? habit.color : undefined,
          }}
        >
          {isCompleted && <Check className="h-4 w-4 text-white" />}
        </button>

        {/* Habit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {habit.name}
            </span>
            {streakCount >= 3 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Flame className="h-3 w-3 text-primary" />
                {streakCount}
              </Badge>
            )}
          </div>
          {habit.description && (
            <p className="text-sm text-muted-foreground truncate">
              {habit.description}
            </p>
          )}
        </div>

        {/* Progress or time */}
        <div className="flex items-center gap-2">
          {hasTarget ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleDecrement}
                disabled={currentValue === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">
                {currentValue}/{habit.target_value}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleIncrement}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            habit.reminder_time && (
              <span className="text-sm text-muted-foreground">
                {habit.reminder_time.slice(0, 5)}
              </span>
            )
          )}
        </div>
      </div>
    </Card>
  );
};
