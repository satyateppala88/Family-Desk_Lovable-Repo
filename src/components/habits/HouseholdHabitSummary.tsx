import { CheckCircle, Percent, Flame, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HouseholdHabitStats } from "@/types/habits";

interface HouseholdHabitSummaryProps {
  stats: HouseholdHabitStats;
}

export const HouseholdHabitSummary = ({ stats }: HouseholdHabitSummaryProps) => {
  const summaryItems = [
    {
      icon: CheckCircle,
      label: "Completed",
      value: stats.completedToday,
      color: "text-accent",
    },
    {
      icon: Percent,
      label: "Rate",
      value: `${stats.completionRate}%`,
      color: "text-primary",
    },
    {
      icon: Flame,
      label: "Best Streak",
      value: stats.longestStreak,
      color: "text-orange-500",
    },
    {
      icon: ListChecks,
      label: "Total Habits",
      value: stats.totalHabits,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {summaryItems.map((item) => (
        <Card key={item.label} className="p-4 text-center">
          <item.icon className={`h-5 w-5 mx-auto mb-2 ${item.color}`} />
          <p className="text-2xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </Card>
      ))}
    </div>
  );
};
