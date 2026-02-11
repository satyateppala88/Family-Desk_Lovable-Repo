import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

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

  return (
    <Link to="/meals" className="block">
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle>Today's Meals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayMeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meals planned for today</p>
          ) : (
            <>
              {["breakfast", "lunch", "dinner"].map((type) => {
                const meals = todayMeals.filter(m => m.meal_type === type);
                if (!meals.length) return null;
                return (
                  <div key={type}>
                    <p className="text-xs text-muted-foreground mb-0.5">{getMealTypeLabel(type)}</p>
                    {meals.map(meal => (
                      <p key={meal.id} className="text-sm">
                        {meal.recipes?.title || "No recipe assigned"}
                      </p>
                    ))}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-1">View meal plan →</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
