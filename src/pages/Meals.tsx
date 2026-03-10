import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";

import { RecipeDetailDialog } from "@/components/meals/RecipeDetailDialog";
import { RecipeRatingDialog } from "@/components/meals/RecipeRatingDialog";
import { MealPlanCalendar } from "@/components/meals/MealPlanCalendar";
import { WeekNavigator } from "@/components/meals/WeekNavigator";
import { MealPlanDownload } from "@/components/meals/MealPlanDownload";
import { MarkAsCookedDialog } from "@/components/meals/MarkAsCookedDialog";
import { useHousehold } from "@/hooks/useHousehold";
import { useRecipes } from "@/hooks/useRecipes";
import { useMealPlans } from "@/hooks/useMealPlans";
import { useRecipeRating } from "@/hooks/useRecipeRating";
import { useFeatureTour } from "@/hooks/useFeatureTour";
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
import { useRegenerateMeals } from "@/hooks/useRegenerateMeals";
import { RecipeCard } from "@/components/meals/RecipeCard";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import type { Step } from "react-joyride";

const mealsTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Meal Planning! Plan your weekly meals with AI-powered suggestions.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='generate-full-week']",
    content: "Generate a complete week of meals based on your dietary preferences and family size.",
    placement: "bottom",
  },
  {
    target: "[data-tour='generate-remaining']",
    content: "Or just fill in the remaining days of the current week.",
    placement: "bottom",
  },
  {
    target: "[role='tablist']",
    content: "Switch between Calendar View to see your weekly plan, or All Recipes to browse your collection.",
    placement: "bottom",
  },
  {
    target: "[data-tour='week-navigator']",
    content: "Navigate between weeks to plan ahead or review past meals.",
    placement: "bottom",
  },
  {
    target: ".user-menu",
    content: "Access settings and restart this tour anytime from the User Guide menu.",
    placement: "bottom",
  },
];

const Meals = () => {
  const { user } = useAuth();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { recipes, isLoading: loadingRecipes, deleteRecipe, updateRecipe } = useRecipes(householdId);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStartDate(new Date(), "sunday"));
  const { mealPlans, isLoading: loadingMealPlans, deleteMealPlanItem } = useMealPlans(householdId, format(currentWeekStart, "yyyy-MM-dd"));
  const { rateRecipe, hideRecipe } = useRecipeRating(householdId);
  
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [ratingRecipe, setRatingRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [view, setView] = useState<"calendar" | "recipes">("calendar");
  const calendarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const regenerateMeals = useRegenerateMeals();
  
  // Feature-specific tour
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("meals");
  const [runOnboarding, setRunOnboarding] = useState(false);

  // Start tour automatically if user hasn't seen it
  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

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
          generateFrom: daysToGenerate === "remaining" ? "today" : "start",
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

  const handleMarkAsCooked = async () => {
    if (!cookingRecipe || !householdId) return;

    try {
      const ingredients = cookingRecipe.ingredients || [];
      
      // Deduct ingredients from pantry
      for (const ingredient of ingredients) {
        const itemName = ingredient.name.toLowerCase().trim();
        const qty = parseFloat(ingredient.quantity) || 0;

        // Find matching pantry item
        const { data: pantryItems } = await supabase
          .from("pantry_items")
          .select("id, quantity, unit")
          .eq("household_id", householdId)
          .ilike("name", itemName)
          .limit(1);

        if (pantryItems && pantryItems.length > 0) {
          const pantryItem = pantryItems[0];
          const newQty = Math.max(0, (pantryItem.quantity || 0) - qty);
          
          await supabase
            .from("pantry_items")
            .update({ quantity: newQty })
            .eq("id", pantryItem.id);
        }
      }

      toast({
        title: "Meal marked as cooked",
        description: "Pantry has been updated with ingredient usage.",
      });
    } catch (error: any) {
      console.error("Error updating pantry:", error);
      toast({
        title: "Error",
        description: "Failed to update pantry. Please adjust manually.",
        variant: "destructive",
      });
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />

      <main className="container px-4 sm:px-6 py-3 sm:py-4 pb-24">
        <div className="mb-4 space-y-3">
          <h1 className="text-xl sm:text-2xl font-bold">Meal Planning</h1>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => handleGeneratePlan("remaining")} 
              size="sm"
              disabled={generatingPlan}
              variant="outline"
              className="flex-1 sm:flex-none"
              data-tour="generate-remaining"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{generatingPlan ? "Generating..." : "Rest of Week"}</span>
              <span className="sm:hidden">Rest</span>
            </Button>
            <Button 
              onClick={() => handleGeneratePlan("full")} 
              size="sm"
              disabled={generatingPlan}
              className="bg-gradient-to-r from-purple-500 to-pink-500 flex-1 sm:flex-none"
              data-tour="generate-full-week"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{generatingPlan ? "Generating..." : "Full Week"}</span>
              <span className="sm:hidden">Full</span>
            </Button>
            <MealPlanDownload 
              mealPlan={currentWeekPlan} 
              weekStart={currentWeekStart}
              calendarRef={calendarRef}
            />
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar View</span>
              <span className="sm:hidden">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">All Recipes</span>
              <span className="sm:hidden">Recipes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div data-tour="week-navigator">
              <WeekNavigator
                weekStart={currentWeekStart}
                onPrevious={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
                onNext={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              />
            </div>
            
            <div ref={calendarRef}>
              <MealPlanCalendar
                mealPlan={currentWeekPlan}
                weekStart={currentWeekStart}
                onRecipeClick={setSelectedRecipe}
                onRateClick={setRatingRecipe}
                onRemoveClick={(itemId) => deleteMealPlanItem.mutate(itemId)}
                onAddClick={() => toast({ title: "Coming soon", description: "Manual recipe addition" })}
                onRegenerateMeal={(dayIndex, mealType) => {
                  if (!householdId) return;
                  regenerateMeals.mutate({
                    householdId,
                    weekStartDate: format(currentWeekStart, "yyyy-MM-dd"),
                    dayOfWeek: dayIndex,
                    mealType: mealType as "breakfast" | "lunch" | "dinner",
                  });
                }}
                onRegenerateDay={(dayIndex) => {
                  if (!householdId) return;
                  regenerateMeals.mutate({
                    householdId,
                    weekStartDate: format(currentWeekStart, "yyyy-MM-dd"),
                    dayOfWeek: dayIndex,
                  });
                }}
                onMarkAsCooked={setCookingRecipe}
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
            <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
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

      <MarkAsCookedDialog
        open={!!cookingRecipe}
        onOpenChange={(open) => !open && setCookingRecipe(null)}
        recipeName={cookingRecipe?.title || ""}
        ingredients={cookingRecipe?.ingredients || []}
        onConfirm={handleMarkAsCooked}
      />

      <OnboardingTour
        run={runOnboarding} 
        onComplete={handleOnboardingComplete} 
        steps={mealsTourSteps}
        featureName="meals"
      />
    </div>
  );
};

export default Meals;
