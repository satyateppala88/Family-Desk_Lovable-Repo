import { Check, Flame, Plus, Minus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HabitWithStreak } from "@/types/habits";
import { useState } from "react";
import { SwipeFillRow } from "@/components/ui/SwipeRow";
import { formatRecurrenceSummary } from "@/utils/recurrenceUtils";
import type { RecurrenceSpec } from "@/types/recurrence";

interface HabitCardProps {
  habit: HabitWithStreak;
  onToggle: (habitId: string, completed: boolean) => void;
  onUpdateValue?: (habitId: string, value: number) => void;
  isPending?: boolean;
}

export const HabitCard = ({ habit, onToggle, onUpdateValue, isPending = false }: HabitCardProps) => {
  const isCompleted = habit.todayLog?.completed || false;
  const currentValue = habit.todayLog?.actual_value || 0;
  const hasTarget = habit.target_value && habit.target_unit;
  const streakCount = habit.streak?.current_streak || 0;
  const longestStreak = habit.streak?.longest_streak || 0;
  const [showCelebration, setShowCelebration] = useState(false);

  const handleToggle = () => {
    if (hasTarget) {
      const newValue = currentValue + 1;
      onUpdateValue?.(habit.id, newValue);
      if (newValue >= (habit.target_value || 0)) {
        onToggle(habit.id, true);
        triggerCelebration();
      }
    } else {
      const newState = !isCompleted;
      onToggle(habit.id, newState);
      if (newState) triggerCelebration();
    }
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1500);
  };

  const handleIncrement = () => {
    const newValue = currentValue + 1;
    onUpdateValue?.(habit.id, newValue);
    if (newValue >= (habit.target_value || 0)) {
      onToggle(habit.id, true);
      triggerCelebration();
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

  const targetProgress = hasTarget && habit.target_value
    ? Math.min(100, (currentValue / habit.target_value) * 100)
    : 0;

  const cardEl = (
    <Card
      className={cn(
        "p-4 transition-all duration-200 relative overflow-hidden",
        isCompleted && "bg-primary/5 border-primary/20",
        !hasTarget && "cursor-pointer hover:shadow-md",
        showCelebration && "ring-2 ring-primary/40",
        isPending && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onClick={hasTarget || isPending ? undefined : handleToggle}
    >
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/5 animate-fade-in pointer-events-none z-10">
          <Sparkles className="w-6 h-6 text-primary animate-bounce" />
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Completion ring */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!hasTarget) handleToggle();
          }}
          disabled={isPending}
          className={cn(
            "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
            isCompleted
              ? "bg-primary border-primary text-primary-foreground scale-105"
              : "border-border hover:border-primary/50",
            isPending && "opacity-50 cursor-not-allowed"
          )}
          style={{ minHeight: "36px" }}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium leading-snug",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {habit.name}
            </span>
          </div>

          {/* Streak display */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {streakCount > 0 && (
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <Flame className="h-3 w-3" />
                {streakCount}d streak
              </span>
            )}
            {longestStreak > streakCount && longestStreak > 0 && (
              <span>Best: {longestStreak}d</span>
            )}
            {habit.reminder_time && !hasTarget && (
              <span>{habit.reminder_time.slice(0, 5)}</span>
            )}
            {(habit as any).recurrence && (
              <span className="truncate">
                {formatRecurrenceSummary((habit as any).recurrence as RecurrenceSpec)}
              </span>
            )}
          </div>

          {/* Target progress bar */}
          {hasTarget && (
            <Progress value={targetProgress} className="h-1.5" />
          )}
        </div>

        {/* Right: counter or time */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {hasTarget ? (
            <>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDecrement} disabled={currentValue === 0 || isPending} style={{ minHeight: "32px" }}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold w-14 text-center tabular-nums">
                {currentValue}/{habit.target_value}
                <span className="block text-[9px] text-muted-foreground font-normal">{habit.target_unit}</span>
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleIncrement} disabled={isPending} style={{ minHeight: "32px" }}>
                <Plus className="h-3 w-3" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );

  // Habits with a quantitative target use the +/- counter; swipe-to-complete
  // only applies to simple yes/no habits that haven't been logged today.
  if (hasTarget || isCompleted) {
    return cardEl;
  }

  return (
    <SwipeFillRow
      radiusClass="rounded-lg"
      fillClass="bg-primary"
      onTrigger={() => {
        onToggle(habit.id, true);
        triggerCelebration();
      }}
    >
      {cardEl}
    </SwipeFillRow>
  );
};
