import { Flame, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HabitScoreBadgeProps {
  points: number;
  streakBonus?: number;
  size?: "sm" | "md";
  className?: string;
}

export const HabitScoreBadge = ({
  points,
  streakBonus,
  size = "sm",
  className,
}: HabitScoreBadgeProps) => {
  if (points === 0 && !streakBonus) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {points > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 bg-primary/10 text-primary hover:bg-primary/20",
            size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5"
          )}
        >
          <Star className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
          <span className="fd-mono">+{points}</span>
        </Badge>
      )}
      {streakBonus && streakBonus > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
            size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5"
          )}
        >
          <Flame className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
          <span className="fd-mono">+{streakBonus}</span>
        </Badge>
      )}
    </div>
  );
};
