import { ShoppingCart } from "lucide-react";
import type { PantryItem } from "@/hooks/usePantryItems";
import { cn } from "@/lib/utils";

interface RunningLowChipsProps {
  items: PantryItem[];
  onAddItem: (item: PantryItem) => void;
  isAdding?: boolean;
}

export const RunningLowChips = ({ items, onAddItem, isAdding }: RunningLowChipsProps) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Running low
        </h3>
        <span className="text-[11px] text-muted-foreground">
          Tap to add to shopping list
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {items.map((item) => {
          const remaining = item.quantity ?? 0;
          const unit = item.unit || "";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAddItem(item)}
              disabled={isAdding}
              className={cn(
                "shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200",
                "dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50",
                "disabled:opacity-60"
              )}
              aria-label={`Add ${item.name} to shopping list`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>{item.name}</span>
              <span className="opacity-70">
                ({remaining}
                {unit ? ` ${unit}` : ""} left)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};