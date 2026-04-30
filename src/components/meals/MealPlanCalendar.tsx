import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Youtube, Trash2, Plus, Flame, RefreshCw, ChefHat, ChevronLeft, ChevronRight } from "lucide-react";
import { MealPlan } from "@/hooks/useMealPlans";
import { getWeekDays, getShortDayName } from "@/lib/weekUtils";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MealPlanCalendarProps {
  mealPlan: MealPlan | null;
  weekStart: Date;
  onRecipeClick: (recipe: any) => void;
  onRateClick: (recipe: any) => void;
  onRemoveClick: (itemId: string) => void;
  onAddClick: (day: number, mealType: string) => void;
  onRegenerateMeal?: (dayIndex: number, mealType: string) => void;
  onRegenerateDay?: (dayIndex: number) => void;
  onMarkAsCooked?: (recipe: any) => void;
}

const BASE_MEAL_TYPES = ["breakfast", "lunch", "dinner"];

export const MealPlanCalendar = ({
  mealPlan,
  weekStart,
  onRecipeClick,
  onRateClick,
  onRemoveClick,
  onAddClick,
  onRegenerateMeal,
  onRegenerateDay,
  onMarkAsCooked,
}: MealPlanCalendarProps) => {
  const weekDays = getWeekDays(weekStart);
  const isMobile = useIsMobile();

  // Mobile: 3-day rolling view centered on today
  const todayIndex = weekDays.findIndex(d => isToday(d));
  const defaultCenter = todayIndex >= 0 ? todayIndex : 0;
  const [mobileCenter, setMobileCenter] = useState(defaultCenter);

  // Track which days have snack row enabled
  const [snackDays, setSnackDays] = useState<Set<number>>(new Set());

  const toggleSnackDay = (dayIndex: number) => {
    setSnackDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  };

  const getMealTypesForDay = (dayIndex: number) => {
    return snackDays.has(dayIndex) ? [...BASE_MEAL_TYPES, "snacks"] : BASE_MEAL_TYPES;
  };

  // Mobile visible indices (3-day window)
  const mobileStart = Math.max(0, Math.min(mobileCenter - 1, 4));
  const mobileIndices = [mobileStart, mobileStart + 1, mobileStart + 2].filter(i => i < 7);

  const getMealForDayAndType = (dayIndex: number, mealType: string) => {
    return mealPlan?.items?.find(
      (item) => item.day_of_week === dayIndex && item.meal_type === mealType
    );
  };

  const getCaloriesPerServing = (recipe: any) => {
    if (!recipe?.nutritional_info?.calories) return null;
    return Math.round(recipe.nutritional_info.calories);
  };

  const getDailyCalories = (dayIndex: number) => {
    return BASE_MEAL_TYPES.reduce((total, mealType) => {
      const meal = getMealForDayAndType(dayIndex, mealType);
      if (meal?.recipe) {
        const calories = getCaloriesPerServing(meal.recipe);
        return total + (calories || 0);
      }
      return total;
    }, 0);
  };

  const handleYouTubeClick = (e: React.MouseEvent, recipeName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(recipeName + " recipe")}`;
    const inIframe = window.self !== window.top;
    if (!isMobile) {
      if (inIframe) {
        try { window.top?.open(url, '_blank'); } catch { window.open(url, '_top'); }
      } else { window.open(url, '_blank'); }
    } else { window.open(url, '_top'); }
  };

  // Compact meal card used in both mobile and desktop
  const MealSlot = ({ dayIndex, mealType }: { dayIndex: number; mealType: string }) => {
    const meal = getMealForDayAndType(dayIndex, mealType);

    if (!meal || !meal.recipe) {
      return (
        <div
          className="border border-dashed border-border/60 rounded-xl p-3 sm:p-4 flex items-center justify-center cursor-pointer hover:bg-accent/50 hover:border-primary/30 transition-colors min-h-[72px] sm:min-h-[100px]"
          onClick={() => onAddClick(dayIndex, mealType)}
          role="button"
          aria-label={`Add ${mealType} for ${getShortDayName(weekDays[dayIndex])}`}
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Plus className="w-4 h-4" />
            <span className="text-xs">Add {mealType}</span>
          </div>
        </div>
      );
    }

    const recipe = meal.recipe;
    const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
    const calories = getCaloriesPerServing(recipe);

    return (
      <Card
        className="p-2.5 sm:p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/30 min-h-[72px] sm:min-h-[100px]"
        onClick={() => onRecipeClick(recipe)}
      >
        <div className="space-y-1.5">
          <h4 className="font-medium text-xs sm:text-sm line-clamp-2 leading-tight">
            {recipe.title}
          </h4>

          {/* Cuisine + meta */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {recipe.cuisine_type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {recipe.cuisine_type}
              </Badge>
            )}
            {totalTime > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />{totalTime}m
              </span>
            )}
            {calories && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Flame className="w-2.5 h-2.5" />{calories}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 pt-0.5">
            {onMarkAsCooked && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600"
                onClick={(e) => { e.stopPropagation(); onMarkAsCooked(recipe); }} title="Mark as cooked">
                <ChefHat className="w-3 h-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); onRateClick(recipe); }}>
              <Star className={cn("w-3 h-3", recipe.rating && "fill-warning text-warning")} />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
              onClick={(e) => handleYouTubeClick(e, recipe.title)}>
              <Youtube className="w-3 h-3" />
            </Button>
            {onRegenerateMeal && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={(e) => { e.stopPropagation(); onRegenerateMeal(dayIndex, mealType); }}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
              onClick={(e) => { e.stopPropagation(); onRemoveClick(meal.id); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // ─── MOBILE: 3-day rolling ───
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Day navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            disabled={mobileStart <= 0} onClick={() => setMobileCenter(c => Math.max(1, c - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-1 flex-1 justify-center">
            {weekDays.map((day, i) => (
              <button key={i}
                className={cn(
                  "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                  mobileIndices.includes(i) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  isToday(day) && !mobileIndices.includes(i) && "ring-1 ring-primary"
                )}
                onClick={() => setMobileCenter(i)}
              >
                {format(day, "d")}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            disabled={mobileStart >= 4} onClick={() => setMobileCenter(c => Math.min(5, c + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day columns */}
        {mobileIndices.map(dayIndex => {
          const day = weekDays[dayIndex];
          const today = isToday(day);
          const past = isBefore(startOfDay(day), startOfDay(new Date())) && !today;
          const mealTypes = getMealTypesForDay(dayIndex);
          const dailyCals = getDailyCalories(dayIndex);

          return (
            <div key={dayIndex} className={cn("rounded-xl border p-3 space-y-2", today && "border-primary/40 bg-primary/[0.02]", past && "opacity-70")}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">{format(day, "EEEE")}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">{format(day, "MMM d")}</span>
                  {today && <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4">Today</Badge>}
                </div>
                {dailyCals > 0 && (
                  <span className="text-xs text-muted-foreground">{dailyCals} cal</span>
                )}
              </div>

              <div className="space-y-2">
                {mealTypes.map(mealType => (
                  <div key={mealType}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{mealType}</p>
                    <MealSlot dayIndex={dayIndex} mealType={mealType} />
                  </div>
                ))}
              </div>

              {/* Add snack row toggle */}
              {!snackDays.has(dayIndex) && (
                <button
                  className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1 transition-colors"
                  onClick={() => toggleSnackDay(dayIndex)}
                >
                  <Plus className="w-3 h-3" /> Add snack / evening
                </button>
              )}

              {onRegenerateDay && getDailyCalories(dayIndex) > 0 && (
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground"
                  onClick={() => onRegenerateDay(dayIndex)}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate day
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── DESKTOP: 7-day grid ───
  return (
    <div className="space-y-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dailyCals = getDailyCalories(index);
          const today = isToday(day);
          return (
            <div key={index} className={cn("text-center p-2.5 rounded-xl space-y-1", today ? "bg-primary/15 ring-1 ring-primary/30" : "bg-muted/50")}>
              <div className="font-semibold text-sm">{getShortDayName(day)}</div>
              <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
              {dailyCals > 0 && <div className="text-xs font-medium text-muted-foreground">{dailyCals} cal</div>}
              {onRegenerateDay && dailyCals > 0 && (
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs px-1" onClick={() => onRegenerateDay(index)}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Swap
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Meal type rows */}
      {BASE_MEAL_TYPES.map(mealType => (
        <div key={mealType}>
          <h3 className="font-semibold capitalize mb-2 text-xs text-muted-foreground uppercase tracking-wider">{mealType}</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((_, dayIndex) => (
              <MealSlot key={dayIndex} dayIndex={dayIndex} mealType={mealType} />
            ))}
          </div>
        </div>
      ))}

      {/* Snack row if any day has it */}
      {Array.from(snackDays).length > 0 && (
        <div>
          <h3 className="font-semibold capitalize mb-2 text-xs text-muted-foreground uppercase tracking-wider">Snacks / Evening</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((_, dayIndex) => (
              snackDays.has(dayIndex)
                ? <MealSlot key={dayIndex} dayIndex={dayIndex} mealType="snacks" />
                : <div key={dayIndex} className="border border-dashed border-border/30 rounded-xl p-3 min-h-[100px] flex items-center justify-center">
                    <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => toggleSnackDay(dayIndex)}>
                      <Plus className="w-3 h-3 mx-auto mb-0.5" /> Add
                    </button>
                  </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop snack toggle row if no days have it yet */}
      {snackDays.size === 0 && (
        <button
          className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2 border border-dashed border-border/40 rounded-xl hover:border-primary/30 transition-colors"
          onClick={() => {
            const all = new Set<number>();
            weekDays.forEach((_, i) => all.add(i));
            setSnackDays(all);
          }}
        >
          <Plus className="w-3 h-3" /> Add Snacks / Evening row
        </button>
      )}
    </div>
  );
};
