import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Youtube, Trash2, Plus, Flame, RefreshCw } from "lucide-react";
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
  onRegenerateMeal?: (dayIndex: number, mealType: string) => void;
  onRegenerateDay?: (dayIndex: number) => void;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

export const MealPlanCalendar = ({
  mealPlan,
  weekStart,
  onRecipeClick,
  onRateClick,
  onRemoveClick,
  onAddClick,
  onRegenerateMeal,
  onRegenerateDay,
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

  const getCaloriesPerServing = (recipe: any) => {
    if (!recipe?.nutritional_info?.calories) return null;
    return Math.round(recipe.nutritional_info.calories);
  };

  const getDailyCalories = (dayIndex: number) => {
    return MEAL_TYPES.reduce((total, mealType) => {
      const meal = getMealForDayAndType(dayIndex, mealType);
      if (meal?.recipe) {
        const calories = getCaloriesPerServing(meal.recipe);
        return total + (calories || 0);
      }
      return total;
    }, 0);
  };

  const getWeeklyCalories = () => {
    return weekDays.reduce((total, _, dayIndex) => {
      return total + getDailyCalories(dayIndex);
    }, 0);
  };

  const getDaysWithMeals = () => {
    return weekDays.filter((_, dayIndex) => getDailyCalories(dayIndex) > 0).length;
  };

  const weeklyCalories = getWeeklyCalories();
  const daysWithMeals = getDaysWithMeals();
  const totalMeals = mealPlan?.items?.length || 0;

  return (
    <div className="space-y-4">
      {/* Weekly Summary */}
      {weeklyCalories > 0 && (
        <div className="p-4 bg-primary/5 rounded-lg border">
          <h3 className="font-semibold mb-3">Weekly Summary (per person)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Week</p>
              <p className="text-2xl font-bold">{weeklyCalories.toLocaleString()} cal</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Daily Average {daysWithMeals > 0 && `(${daysWithMeals} days)`}
              </p>
              <p className="text-2xl font-bold">
                {daysWithMeals > 0 ? Math.round(weeklyCalories / daysWithMeals).toLocaleString() : 0} cal
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meals Planned</p>
              <p className="text-2xl font-bold">{totalMeals}</p>
            </div>
          </div>
        </div>
      )}

      {/* Day headers with calorie summary */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dailyCalories = getDailyCalories(index);
          return (
            <div
              key={index}
              className="text-center p-2 bg-primary/10 rounded-lg space-y-1"
            >
              <div className="font-semibold text-sm">{getShortDayName(day)}</div>
              <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
              {dailyCalories > 0 && (
                <div className="text-xs font-medium text-orange-600">
                  {dailyCalories} cal
                </div>
              )}
              {onRegenerateDay && dailyCalories > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-full text-xs"
                  onClick={() => onRegenerateDay(index)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Regenerate
                </Button>
              )}
            </div>
          );
        })}
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
              const calories = getCaloriesPerServing(recipe);

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

                    {/* Time, rating, and calories */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
                      {calories && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Flame className="w-3 h-3" />
                          <span>{calories} cal</span>
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
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={getYouTubeSearchUrl(recipe.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Watch recipe on YouTube"
                        >
                          <Youtube className="w-3 h-3" />
                        </a>
                      </Button>
                      {onRegenerateMeal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRegenerateMeal(dayIndex, mealType);
                          }}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      )}
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
