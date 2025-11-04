import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Youtube, Trash2, Plus } from "lucide-react";
import { MealPlan } from "@/hooks/useMealPlans";
import { getWeekDays, getShortDayName } from "@/lib/weekUtils";
import { format } from "date-fns";

interface MealPlanCalendarProps {
  mealPlan: MealPlan | null;
  weekStart: Date;
  onRecipeClick: (recipe: any) => void;
  onRateClick: (recipe: any) => void;
  onRemoveClick: (itemId: string) => void;
  onAddClick: (day: number, mealType: string) => void;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

export const MealPlanCalendar = ({
  mealPlan,
  weekStart,
  onRecipeClick,
  onRateClick,
  onRemoveClick,
  onAddClick,
}: MealPlanCalendarProps) => {
  const weekDays = getWeekDays(weekStart);

  const getMealForDayAndType = (dayIndex: number, mealType: string) => {
    return mealPlan?.items?.find(
      (item) => item.day_of_week === dayIndex && item.meal_type === mealType
    );
  };

  const getYouTubeSearchUrl = (recipeName: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(recipeName + " recipe")}`;
  };

  return (
    <div className="space-y-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-center p-2 bg-primary/10 rounded-lg"
          >
            <div className="font-semibold text-sm">{getShortDayName(day)}</div>
            <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
          </div>
        ))}
      </div>

      {/* Meal rows */}
      {MEAL_TYPES.map((mealType) => (
        <div key={mealType}>
          <h3 className="font-semibold capitalize mb-2 text-sm">{mealType}</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((_, dayIndex) => {
              const meal = getMealForDayAndType(dayIndex, mealType);

              if (!meal || !meal.recipe) {
                return (
                  <Card
                    key={dayIndex}
                    className="p-3 min-h-[120px] flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => onAddClick(dayIndex, mealType)}
                  >
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </Card>
                );
              }

              const recipe = meal.recipe;
              const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

              return (
                <Card
                  key={dayIndex}
                  className="p-3 min-h-[120px] hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onRecipeClick(recipe)}
                >
                  <div className="space-y-2">
                    {/* Recipe name */}
                    <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                      {recipe.title}
                    </h4>

                    {/* Time and rating */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{totalTime}m</span>
                      </div>
                      {recipe.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{recipe.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRateClick(recipe);
                        }}
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(getYouTubeSearchUrl(recipe.title), "_blank");
                        }}
                      >
                        <Youtube className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveClick(meal.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
