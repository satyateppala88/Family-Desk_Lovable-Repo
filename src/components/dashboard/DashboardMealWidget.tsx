import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Meal {
  id: string;
  meal_type: string;
  recipes?: {
    title: string;
    cuisine_type: string | null;
  } | null;
}

interface DashboardMealWidgetProps {
  todayMeals: Meal[];
}

export const DashboardMealWidget = ({ todayMeals }: DashboardMealWidgetProps) => {
  const getMealTypeLabel = (mealType: string) => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case "breakfast":
        return "hsl(var(--chart-1))";
      case "lunch":
        return "hsl(var(--chart-2))";
      case "dinner":
        return "hsl(var(--chart-3))";
      default:
        return "hsl(var(--accent))";
    }
  };

  return (
    <Link to="/meals" className="block hover:scale-[1.02] transition-transform">
      <Card className="h-full border-l-4 border-l-accent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-accent" />
              <span>Today's Meals</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayMeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meals planned for today</p>
          ) : (
            <>
              {/* Group meals by type */}
              {(() => {
                const mealsByType = {
                  breakfast: todayMeals.filter(m => m.meal_type === "breakfast"),
                  lunch: todayMeals.filter(m => m.meal_type === "lunch"),
                  dinner: todayMeals.filter(m => m.meal_type === "dinner"),
                };

                const mealTypes = [
                  { key: "breakfast" as const, label: "Breakfast", icon: "☀️" },
                  { key: "lunch" as const, label: "Lunch", icon: "🌤️" },
                  { key: "dinner" as const, label: "Dinner", icon: "🌙" },
                ];

                return mealTypes.map(({ key, label, icon }) => {
                  const meals = mealsByType[key];
                  if (!meals?.length) return null;
                  
                  return (
                    <div key={key} className="space-y-1">
                      <h4 
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: getMealTypeColor(key) }}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </h4>
                      {meals.map(meal => (
                        <div key={meal.id} className="ml-5 space-y-0.5">
                          <p className="text-sm font-medium">
                            {meal.recipes?.title || "No recipe assigned"}
                          </p>
                          {meal.recipes?.cuisine_type && (
                            <p className="text-xs text-muted-foreground">
                              {meal.recipes.cuisine_type}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
              <div className="flex items-center justify-end gap-1 text-sm text-accent font-medium mt-2 pt-2 border-t">
                View meal plan <ArrowRight className="h-4 w-4" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
