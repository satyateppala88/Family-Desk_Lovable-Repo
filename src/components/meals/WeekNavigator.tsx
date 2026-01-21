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
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      <Button variant="outline" size="icon" onClick={onPrevious} className="h-10 w-10">
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="text-base sm:text-lg font-semibold min-w-[180px] sm:min-w-[200px] text-center">
        {formatWeekRange(weekStart)}
      </div>
      <Button variant="outline" size="icon" onClick={onNext} className="h-10 w-10">
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
};
