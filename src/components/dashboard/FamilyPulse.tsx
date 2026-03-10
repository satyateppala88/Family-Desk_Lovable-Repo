import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, UtensilsCrossed, Sparkles } from "lucide-react";
import { isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";
import { cn } from "@/lib/utils";

interface FamilyPulseProps {
  stats: {
    pendingTasksCount: number;
    todayMeals: any[];
    pantryItemsCount: number;
    tasks: any[];
  } | null | undefined;
  enabledProducts: any;
}

export const FamilyPulse = ({ stats, enabledProducts }: FamilyPulseProps) => {
  if (!stats) return null;

  const signals: { icon: React.ElementType; text: string; mood: "good" | "neutral" | "attention" }[] = [];

  // Tasks signal
  if (isProductEnabled(enabledProducts, "tasks" as ProductName)) {
    if (stats.pendingTasksCount === 0) {
      signals.push({ icon: CheckCircle2, text: "All tasks complete — nice work!", mood: "good" });
    } else if (stats.pendingTasksCount <= 3) {
      signals.push({ icon: CheckCircle2, text: `${stats.pendingTasksCount} tasks left today`, mood: "neutral" });
    } else {
      signals.push({ icon: CheckCircle2, text: `${stats.pendingTasksCount} tasks need attention`, mood: "attention" });
    }
  }

  // Meals signal
  if (isProductEnabled(enabledProducts, "meals" as ProductName)) {
    if (stats.todayMeals?.length > 0) {
      signals.push({ icon: UtensilsCrossed, text: `${stats.todayMeals.length} meals planned today`, mood: "good" });
    }
  }

  if (signals.length === 0) return null;

  const allGood = signals.every(s => s.mood === "good");

  return (
    <Card className={cn("mb-4 border-border/60", allGood && "border-[hsl(var(--success))]/15 bg-[hsl(var(--success))]/3")}>
      <CardContent className="p-3 flex items-center gap-3">
        {allGood && (
          <div className="rounded-full bg-[hsl(var(--success))]/10 p-1.5 shrink-0 animate-celebrate-pop">
            <Sparkles className="h-4 w-4 text-[hsl(var(--success))]" aria-hidden="true" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {signals.map((signal, i) => {
              const Icon = signal.icon;
              return (
                <span
                  key={i}
                  className={cn(
                    "text-xs flex items-center gap-1.5",
                    signal.mood === "good" && "text-[hsl(var(--success))]",
                    signal.mood === "attention" && "text-warning",
                    signal.mood === "neutral" && "text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {signal.text}
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
