import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Allow navigating to future months (default: false) */
  allowFuture?: boolean;
}

export const MonthSwitcher = ({ className, allowFuture = false }: Props) => {
  const { label, shift, isCurrent, setMonth, currentMonth } = useSelectedMonth();

  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-xl border bg-card px-2 py-1.5", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Previous month"
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="flex-1 text-center">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => setMonth(currentMonth)}
            className="text-[10px] text-primary hover:underline"
          >
            Jump to current
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Next month"
        disabled={!allowFuture && isCurrent}
        onClick={() => shift(1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};