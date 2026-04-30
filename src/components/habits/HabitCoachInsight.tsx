import { Lightbulb, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HabitCoachInsightProps {
  content: string;
  onDismiss?: () => void;
}

export const HabitCoachInsight = ({ content, onDismiss }: HabitCoachInsightProps) => {
  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary mb-1">AI Coach Insight</p>
          <p className="text-sm text-muted-foreground">{content}</p>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};
