import { useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { RecipeDetailDialog } from "@/components/meals/RecipeDetailDialog";
import { RecipeRatingDialog } from "@/components/meals/RecipeRatingDialog";
import { MealPlanCalendar } from "@/components/meals/MealPlanCalendar";
import { WeekNavigator } from "@/components/meals/WeekNavigator";
import { MealPlanDownload } from "@/components/meals/MealPlanDownload";
import { useHousehold } from "@/hooks/useHousehold";
import { useRecipes } from "@/hooks/useRecipes";
import { useMealPlans } from "@/hooks/useMealPlans";
import { useRecipeRating } from "@/hooks/useRecipeRating";
import { Recipe } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getWeekStartDate, getRemainingDaysOfWeek } from "@/lib/weekUtils";
import { addWeeks, format } from "date-fns";
import { RecipeCard } from "@/components/meals/RecipeCard";

const Meals = () => {
  const { user } = useAuth();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { recipes, isLoading: loadingRecipes, deleteRecipe, updateRecipe } = useRecipes(householdId);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStartDate(new Date(), "sunday"));
  const { mealPlans, isLoading: loadingMealPlans, deleteMealPlanItem } = useMealPlans(householdId, format(currentWeekStart, "yyyy-MM-dd"));
  const { rateRecipe, hideRecipe } = useRecipeRating(householdId);
  
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [ratingRecipe, setRatingRecipe] = useState<Recipe | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [view, setView] = useState<"calendar" | "recipes">("calendar");
  const calendarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentWeekPlan = mealPlans[0] || null;

  const handleGeneratePlan = async (daysToGenerate: "full" | "remaining") => {
    if (!householdId || !user) return;

    const numDays = daysToGenerate === "full" ? 7 : getRemainingDaysOfWeek("sunday");
    
    setGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-suggestions", {
        body: {
          householdId,
          userId: user.id,
          numDays,
          weekStartDate: format(currentWeekStart, "yyyy-MM-dd"),
          generateFrom: daysToGenerate === "remaining" ? "today" : "week_start",
        },
      });

      if (error) throw error;

      toast({
        title: "Meal plan generated!",
        description: `Created ${data.meals?.length || 0} AI-powered recipes for your week.`,
      });
      
      window.location.reload();
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate meal plan",
        variant: "destructive",
      });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleRate = (recipeId: string, rating: number) => {
    rateRecipe.mutate({ recipeId, rating });
  };

  const handleHide = (recipeId: string) => {
    hideRecipe.mutate(recipeId);
  };

  const handleRemoveFromWeek = (recipeId: string) => {
    const item = currentWeekPlan?.items?.find(i => i.recipe_id === recipeId);
    if (item) {
      deleteMealPlanItem.mutate(item.id);
    }
  };

  const handleToggleFavorite = (id: string, isFavorite: boolean) => {
    updateRecipe.mutate({ id, updates: { is_favorite: isFavorite } });
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipe.mutate(id);
    }
  };

  if (loadingHousehold || loadingRecipes) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[400px]" />
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="container px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meal Planning</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleGeneratePlan("remaining")} 
              size="sm"
              disabled={generatingPlan}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingPlan ? "Generating..." : "Rest of Week"}
            </Button>
            <Button 
              onClick={() => handleGeneratePlan("full")} 
              size="sm"
              disabled={generatingPlan}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingPlan ? "Generating..." : "Full Week"}
            </Button>
            <MealPlanDownload 
              mealPlan={currentWeekPlan} 
              weekStart={currentWeekStart}
              calendarRef={calendarRef}
            />
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="recipes">
              <LayoutGrid className="w-4 h-4 mr-2" />
              All Recipes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <WeekNavigator
              weekStart={currentWeekStart}
              onPrevious={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
              onNext={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            />
            
            <div ref={calendarRef}>
              <MealPlanCalendar
                mealPlan={currentWeekPlan}
                weekStart={currentWeekStart}
                onRecipeClick={setSelectedRecipe}
                onRateClick={setRatingRecipe}
                onRemoveClick={(itemId) => deleteMealPlanItem.mutate(itemId)}
                onAddClick={() => toast({ title: "Coming soon", description: "Manual recipe addition" })}
              />
            </div>

            {!currentWeekPlan && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No meal plan for this week yet.</p>
                <Button onClick={() => handleGeneratePlan("full")} disabled={generatingPlan}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Meal Plan
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recipes">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDeleteRecipe}
                  onClick={setSelectedRecipe}
                  onRate={setRatingRecipe}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
        onRate={setRatingRecipe}
      />

      <RecipeRatingDialog
        recipe={ratingRecipe}
        open={!!ratingRecipe}
        onOpenChange={(open) => !open && setRatingRecipe(null)}
        onRate={handleRate}
        onHide={handleHide}
        onRemoveFromWeek={handleRemoveFromWeek}
      />
    </div>
  );
};

export default Meals;
