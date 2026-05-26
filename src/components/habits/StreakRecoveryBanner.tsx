import { Snowflake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissedHabit } from "@/hooks/useMissedHabitsYesterday";

interface Props {
  missed: MissedHabit[];
  freezesRemaining: number;
  onUseFreeze: () => void;
  onDismiss: () => void;
  isApplying?: boolean;
}

export const StreakRecoveryBanner = ({ missed, freezesRemaining, onUseFreeze, onDismiss, isApplying }: Props) => {
  if (missed.length === 0) return null;
  const top = missed[0];
  const others = missed.length - 1;

  return (
    <Card className="border-sky-200 bg-sky-50/40">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Snowflake className="h-5 w-5 text-sky-500 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              You missed yesterday — use your streak freeze to protect your {top.currentStreak}-day streak?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {top.name}{others > 0 ? ` + ${others} more` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={onUseFreeze}
            disabled={freezesRemaining <= 0 || isApplying}
          >
            {freezesRemaining <= 0 ? "0 freezes left this month" : "Use Freeze"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Let it reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};