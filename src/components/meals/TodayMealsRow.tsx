import { Plus, UtensilsCrossed } from "lucide-react";
import type { SlotMealType } from "./AiSuggestSheet";
import type { Recipe } from "@/types/database";

interface SlotData {
  mealType: SlotMealType;
  label: string;
  recipe: Recipe | null;
}

interface TodayMealsRowProps {
  slots: SlotData[];
  onAdd: (mealType: SlotMealType) => void;
  onOpen: (recipe: Recipe) => void;
}

export const TodayMealsRow = ({ slots, onAdd, onOpen }: TodayMealsRowProps) => {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
      <div className="flex gap-2 min-w-max sm:grid sm:grid-cols-4 sm:min-w-0">
        {slots.map((slot) => (
          <button
            key={slot.mealType}
            type="button"
            onClick={() => slot.recipe ? onOpen(slot.recipe) : onAdd(slot.mealType)}
            className="w-[150px] sm:w-auto shrink-0 rounded-xl border bg-card p-3 text-left hover:bg-accent/30 transition-colors"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{slot.label}</p>
            {slot.recipe ? (
              <div className="mt-1.5 flex items-center gap-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-sm font-medium line-clamp-2">{slot.recipe.title}</p>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-1 text-sm text-primary">
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};