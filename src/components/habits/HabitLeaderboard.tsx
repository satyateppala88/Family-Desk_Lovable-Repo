import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardEntry } from "@/types/habits";
import { cn } from "@/lib/utils";

interface HabitLeaderboardProps {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  period?: "weekly" | "monthly";
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
};

const getRankChange = (current: number, previous: number | null) => {
  if (previous === null) return null;
  const diff = previous - current;
  if (diff > 0) return { icon: TrendingUp, value: diff, color: "text-emerald-600" };
  if (diff < 0) return { icon: TrendingDown, value: Math.abs(diff), color: "text-destructive" };
  return { icon: Minus, value: 0, color: "text-muted-foreground" };
};

export const HabitLeaderboard = ({
  entries,
  isLoading,
  period = "weekly",
}: HabitLeaderboardProps) => {
  if (isLoading) {
    return (
      <Card>
      <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            Household Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Household Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Complete habits to appear on the leaderboard!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            Household Leaderboard
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {period === "weekly" ? "This Week" : "This Month"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => {
          const rankChange = getRankChange(entry.rank, entry.previousRank);
          const score = period === "weekly" ? entry.weeklyScore : entry.monthlyScore;

          return (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                entry.rank <= 3 && "bg-accent/50"
              )}
            >
              <span className="text-lg font-bold w-8 text-center">
                {getRankIcon(entry.rank)}
              </span>
              
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {entry.displayName?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {entry.displayName}
                </p>
                {entry.streakBonus > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{entry.streakBonus} streak bonus
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{score} pts</span>
                {rankChange && (
                  <div className={cn("flex items-center", rankChange.color)}>
                    <rankChange.icon className="h-3 w-3" />
                    {rankChange.value > 0 && (
                      <span className="text-xs">{rankChange.value}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
