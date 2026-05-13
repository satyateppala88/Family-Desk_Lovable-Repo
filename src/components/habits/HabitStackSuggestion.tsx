import { Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHabitStackSuggestions } from "@/data/habitStackSuggestions";

interface Props {
  habitName: string;
  onPick: (suggestion: string) => void;
  onDismiss: () => void;
}

export const HabitStackSuggestion = ({ habitName, onPick, onDismiss }: Props) => {
  const suggestions = getHabitStackSuggestions(habitName).slice(0, 2);
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 animate-fade-up">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Pair it with another habit?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Many people stack “{habitName}” with one of these.
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 -mr-1 -mt-1" onClick={onDismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => onPick(s)}>
              + {s}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};