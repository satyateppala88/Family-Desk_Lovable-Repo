import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatWeekRange } from "@/lib/weekUtils";

interface WeekNavigatorProps {
  weekStart: Date;
  onPrevious: () => void;
  onNext: () => void;
}

export const WeekNavigator = ({ weekStart, onPrevious, onNext }: WeekNavigatorProps) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="icon" onClick={onPrevious}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="text-lg font-semibold min-w-[200px] text-center">
        {formatWeekRange(weekStart)}
      </div>
      <Button variant="outline" size="icon" onClick={onNext}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
