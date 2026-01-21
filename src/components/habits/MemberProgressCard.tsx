import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberHabitStats } from "@/types/habits";

interface MemberProgressCardProps {
  member: MemberHabitStats;
}

export const MemberProgressCard = ({ member }: MemberProgressCardProps) => {
  const completionPercent =
    member.plannedToday > 0
      ? Math.round((member.completedToday / member.plannedToday) * 100)
      : 0;

  return (
    <Card className="p-4 min-w-[140px] text-center">
      <Avatar className="h-12 w-12 mx-auto mb-2">
        <AvatarImage src={member.avatarUrl || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {member.displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="font-medium text-sm truncate">{member.displayName}</p>
      <p className="text-lg font-bold text-primary">
        {member.completedToday}/{member.plannedToday}
      </p>
      {member.currentStreak >= 3 && (
        <div className="flex items-center justify-center gap-1 text-primary text-xs mt-1">
          <Flame className="h-3 w-3" />
          <span>{member.currentStreak}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {completionPercent}% today
      </p>
    </Card>
  );
};
