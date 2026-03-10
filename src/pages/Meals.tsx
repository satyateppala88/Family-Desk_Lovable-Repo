import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { RecipeDetailDialog } from "@/components/meals/RecipeDetailDialog";
import { RecipeRatingDialog } from "@/components/meals/RecipeRatingDialog";
import { MealPlanCalendar } from "@/components/meals/MealPlanCalendar";
import { WeekNavigator } from "@/components/meals/WeekNavigator";
import { MealPlanDownload } from "@/components/meals/MealPlanDownload";
import { MarkAsCookedDialog } from "@/components/meals/MarkAsCookedDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHousehold } from "@/hooks/useHousehold";
import { useRecipes } from "@/hooks/useRecipes";
import { useMealPlans } from "@/hooks/useMealPlans";
import { useRecipeRating } from "@/hooks/useRecipeRating";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { Recipe } from "@/types/database";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { Sparkles, Calendar, LayoutGrid, UtensilsCrossed } from "lucide-react";
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
    content: "Welcome to Meal Planning! Let AI help you plan nutritious meals for the whole family.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='generate-full-week']",
    content: "Generate a complete week of meals tailored to your family's preferences and dietary needs.",
    placement: "bottom",
  },
  {
    target: "[data-tour='generate-remaining']",
    content: "Or just fill in the rest of the week from today.",
    placement: "bottom",
  },
  {
    target: "[role='tablist']",
    content: "Switch between your weekly calendar and your full recipe collection.",
    placement: "bottom",
  },
  {
    target: "[data-tour='week-navigator']",
    content: "Navigate between weeks to plan ahead or revisit past meals.",
    placement: "bottom",
  },
  {
    target: ".user-menu",
    content: "You can restart this guide anytime from the menu.",
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
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const regenerateMeals = useRegenerateMeals();
  
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("meals");
  const [runOnboarding, setRunOnboarding] = useState(false);

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
        title: "Meal plan ready! 🍽️",
        description: `Created ${data.meals?.length || 0} recipes for your family this week.`,
      });
      
      window.location.reload();
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      toast({
        title: "Something went wrong",
        description: error.message || "We couldn't generate the meal plan. Please try again.",
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
    setDeleteRecipeId(id);
  };

  const confirmDeleteRecipe = () => {
    if (deleteRecipeId) {
      deleteRecipe.mutate(deleteRecipeId);
      setDeleteRecipeId(null);
    }
  };

  const handleMarkAsCooked = async () => {
    if (!cookingRecipe || !householdId) return;

    try {
      const ingredients = cookingRecipe.ingredients || [];
      
      for (const ingredient of ingredients) {
        const itemName = ingredient.name.toLowerCase().trim();
        const qty = parseFloat(ingredient.quantity) || 0;

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
        title: "Marked as cooked! 👨‍🍳",
        description: "Your pantry has been updated to reflect what was used.",
      });
    } catch (error: any) {
      console.error("Error updating pantry:", error);
      toast({
        title: "Pantry update issue",
        description: "Some pantry items may not have been updated. You can adjust them manually.",
        variant: "destructive",
      });
    }
  };

  if (loadingHousehold || loadingRecipes) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <PageLoading cards={3} />
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header onStartOnboarding={handleStartOnboarding} />

      <main className="page-content">
        <div className="mb-4 space-y-3">
          <div>
            <h1 className="page-heading">Meal Planning</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {recipes.length > 0 ? `${recipes.length} recipes in your collection` : "Let AI create your first meal plan"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => handleGeneratePlan("remaining")} 
              size="sm"
              disabled={generatingPlan}
              variant="outline"
              className="flex-1 sm:flex-none"
              data-tour="generate-remaining"
            >
              <Sparkles className="w-4 h-4 sm:mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">{generatingPlan ? "Creating..." : "Rest of Week"}</span>
              <span className="sm:hidden">Rest</span>
            </Button>
            <Button 
              onClick={() => handleGeneratePlan("full")} 
              size="sm"
              disabled={generatingPlan}
              className="flex-1 sm:flex-none"
              data-tour="generate-full-week"
            >
              <Sparkles className="w-4 h-4 sm:mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">{generatingPlan ? "Creating..." : "Full Week"}</span>
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
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Calendar View</span>
              <span className="sm:hidden">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="gap-2">
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
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
            
            <div ref={calendarRef} className="overflow-x-auto -mx-[var(--page-padding-x)] px-[var(--page-padding-x)]">
              <MealPlanCalendar
                mealPlan={currentWeekPlan}
                weekStart={currentWeekStart}
                onRecipeClick={setSelectedRecipe}
                onRateClick={setRatingRecipe}
                onRemoveClick={(itemId) => deleteMealPlanItem.mutate(itemId)}
                onAddClick={() => toast({ title: "Coming soon", description: "Manual recipe addition is on its way!" })}
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
              <EmptyState
                icon={UtensilsCrossed}
                title="No meals planned this week"
                description="Let AI suggest recipes based on your family's preferences."
                encouragement="Meal planning saves time and reduces food waste!"
                action={{
                  label: "Generate Meal Plan",
                  onClick: () => handleGeneratePlan("full"),
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="recipes">
            {recipes.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Your recipe collection is empty"
                description="Generate a meal plan and your AI-created recipes will appear here."
                encouragement="Each recipe is tailored to your household's dietary preferences."
                action={{
                  label: "Generate Recipes",
                  onClick: () => handleGeneratePlan("full"),
                }}
              />
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
            )}
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

      <ConfirmDialog
        open={!!deleteRecipeId}
        onOpenChange={(open) => !open && setDeleteRecipeId(null)}
        title="Delete this recipe?"
        description="This recipe will be permanently removed from your collection. Any meal plan entries using it will also be affected."
        confirmLabel="Delete Recipe"
        variant="destructive"
        onConfirm={confirmDeleteRecipe}
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
