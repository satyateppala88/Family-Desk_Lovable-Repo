import { useState, useRef, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { RecipeDetailDialog } from "@/components/meals/RecipeDetailDialog";
import { RecipeRatingDialog } from "@/components/meals/RecipeRatingDialog";
import { MealPlanCalendar } from "@/components/meals/MealPlanCalendar";
import { WeekNavigator } from "@/components/meals/WeekNavigator";
import { MealPlanDownload } from "@/components/meals/MealPlanDownload";
import { MarkAsCookedDialog } from "@/components/meals/MarkAsCookedDialog";
import { RecipeBrowserSheet } from "@/components/meals/RecipeBrowserSheet";
import { TonightDinnerCard } from "@/components/meals/TonightDinnerCard";
import { TodayMealsRow } from "@/components/meals/TodayMealsRow";
import { AddMealSheet } from "@/components/meals/AddMealSheet";
import { AiSuggestSheet, type SlotMealType } from "@/components/meals/AiSuggestSheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useHousehold } from "@/hooks/useHousehold";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useRecipes } from "@/hooks/useRecipes";
import { useMealPlans } from "@/hooks/useMealPlans";
import { useRecipeRating } from "@/hooks/useRecipeRating";
import { Recipe } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { Sparkles, Calendar, LayoutGrid, UtensilsCrossed, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { getWeekStartDate, getRemainingDaysOfWeek, getWeekDays, getShortDayName } from "@/lib/weekUtils";
import { addWeeks, format } from "date-fns";
import { useRegenerateMeals } from "@/hooks/useRegenerateMeals";
import { RecipeCard } from "@/components/meals/RecipeCard";
import { assignRecipeToSlot } from "@/lib/meals/assignRecipeToSlot";

const CUISINE_FILTERS = ["Indian", "Italian", "Chinese", "Thai", "Mexican", "Mediterranean"];
const DIFFICULTY_FILTERS = ["easy", "medium", "hard"];

const Meals = () => {
  const { user } = useAuth();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const queryClient = useQueryClient();
  useRealtimeSubscription([
    { table: "meal_plans", filter: householdId ? `household_id=eq.${householdId}` : undefined, enabled: !!householdId, queryKeys: [["meal-plans", householdId]] },
    { table: "meal_plan_items", enabled: !!householdId, queryKeys: [["meal-plans", householdId]] },
  ]);
  const { recipes, isLoading: loadingRecipes, deleteRecipe, updateRecipe } = useRecipes(householdId);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStartDate(new Date(), "sunday"));
  const { mealPlans, isLoading: loadingMealPlans, deleteMealPlanItem } = useMealPlans(householdId, format(currentWeekStart, "yyyy-MM-dd"));
  const { rateRecipe, hideRecipe } = useRecipeRating(householdId);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [ratingRecipe, setRatingRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [view, setView] = useState<"today" | "recipes">("today");
  const [weekOpen, setWeekOpen] = useState(false);
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const regenerateMeals = useRegenerateMeals();

  // Sheet state
  const [addSheet, setAddSheet] = useState<{ open: boolean; mealType: SlotMealType }>({ open: false, mealType: "dinner" });
  const [aiSheet, setAiSheet] = useState<{ open: boolean; mealType: SlotMealType }>({ open: false, mealType: "dinner" });
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSlot, setBrowserSlot] = useState<{ day: number; mealType: SlotMealType } | null>(null);

  // Recipe tab search/filter state
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeCuisine, setRecipeCuisine] = useState<string | null>(null);
  const [recipeDifficulty, setRecipeDifficulty] = useState<string | null>(null);

  useEffect(() => {
    if (view === "today") {
      setCurrentWeekStart(getWeekStartDate(new Date(), "sunday"));
    }
  }, [view]);

  const currentWeekPlan = mealPlans[0] || null;

  // Today's day index relative to current week start (Sunday)
  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(currentWeekStart);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(6, diff));
  }, [currentWeekStart]);

  const todaysItems = useMemo(() => {
    return (currentWeekPlan?.items || []).filter((i: any) => i.day_of_week === todayIndex);
  }, [currentWeekPlan, todayIndex]);

  const recipeFor = (mealType: SlotMealType): Recipe | null => {
    const item = todaysItems.find((i: any) => i.meal_type === mealType);
    return (item?.recipe as Recipe | undefined) || null;
  };

  const todaysDinner = recipeFor("dinner");

  const slots = [
    { mealType: "breakfast" as SlotMealType, label: "Breakfast", recipe: recipeFor("breakfast") },
    { mealType: "lunch" as SlotMealType, label: "Lunch", recipe: recipeFor("lunch") },
    { mealType: "dinner" as SlotMealType, label: "Dinner", recipe: recipeFor("dinner") },
    { mealType: "snack" as SlotMealType, label: "Snacks", recipe: recipeFor("snack") },
  ];

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      if (recipeSearch && !r.title.toLowerCase().includes(recipeSearch.toLowerCase())) return false;
      if (recipeCuisine && r.cuisine_type?.toLowerCase() !== recipeCuisine.toLowerCase()) return false;
      if (recipeDifficulty && r.difficulty !== recipeDifficulty) return false;
      return true;
    });
  }, [recipes, recipeSearch, recipeCuisine, recipeDifficulty]);

  const handleGeneratePlan = async (daysToGenerate: "full" | "remaining") => {
    if (!householdId || !user) return;
    const numDays = daysToGenerate === "full" ? 7 : getRemainingDaysOfWeek("sunday");
    setGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-suggestions", {
        body: { householdId, userId: user.id, numDays, weekStartDate: format(currentWeekStart, "yyyy-MM-dd"), generateFrom: daysToGenerate === "remaining" ? "today" : "start" },
      });
      if (error) throw error;
      toast({ title: "Meal plan ready! 🍽️", description: `Created ${data.meals?.length || 0} recipes for your family this week.` });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Something went wrong", description: error.message || "We couldn't generate the meal plan. Please try again.", variant: "destructive" });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleRate = (recipeId: string, rating: number) => rateRecipe.mutate({ recipeId, rating });
  const handleHide = (recipeId: string) => hideRecipe.mutate(recipeId);
  const handleRemoveFromWeek = (recipeId: string) => {
    const item = currentWeekPlan?.items?.find((i: any) => i.recipe_id === recipeId);
    if (item) deleteMealPlanItem.mutate(item.id);
  };
  const handleToggleFavorite = (id: string, isFavorite: boolean) => updateRecipe.mutate({ id, updates: { is_favorite: isFavorite } });
  const handleDeleteRecipe = (id: string) => setDeleteRecipeId(id);
  const confirmDeleteRecipe = () => { if (deleteRecipeId) { deleteRecipe.mutate(deleteRecipeId); setDeleteRecipeId(null); } };

  const handleAddClick = (day: number, mealType: string) => {
    if (recipes.length === 0) {
      toast({ title: "No recipes yet", description: "Generate a meal plan first to build your recipe collection." });
      return;
    }
    setBrowserSlot({ day, mealType: mealType as SlotMealType });
    setBrowserOpen(true);
  };

  const handleAssignFromBrowser = async (recipe: Recipe) => {
    if (!user || !householdId || !browserSlot) return;
    try {
      await assignRecipeToSlot({
        householdId, userId: user.id,
        weekStartDate: format(currentWeekStart, "yyyy-MM-dd"),
        dayOfWeek: browserSlot.day, mealType: browserSlot.mealType, recipeId: recipe.id,
      });
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      toast({ title: "Added to your plan", description: recipe.title });
    } catch (e: any) {
      toast({ title: "Couldn't add", description: e.message || "Try again.", variant: "destructive" });
    }
    setBrowserOpen(false);
  };

  const openAddSheet = (mealType: SlotMealType) => setAddSheet({ open: true, mealType });
  const openAiSheet = (mealType: SlotMealType) => setAiSheet({ open: true, mealType });
  const openBrowseForToday = (mealType: SlotMealType) => {
    if (recipes.length === 0) {
      toast({ title: "No recipes yet", description: "Try AI Suggest or generate a meal plan first." });
      return;
    }
    setBrowserSlot({ day: todayIndex, mealType });
    setBrowserOpen(true);
  };

  const handleMarkAsCooked = async () => {
    if (!cookingRecipe || !householdId) return;
    try {
      const ingredients = cookingRecipe.ingredients || [];
      for (const ingredient of ingredients) {
        const itemName = ingredient.name.toLowerCase().trim();
        const qty = parseFloat(ingredient.quantity) || 0;
        const { data: pantryItems } = await supabase.from("pantry_items").select("id, quantity, unit").eq("household_id", householdId).ilike("name", itemName).limit(1);
        if (pantryItems && pantryItems.length > 0) {
          const pantryItem = pantryItems[0];
          const newQty = Math.max(0, (pantryItem.quantity || 0) - qty);
          await supabase.from("pantry_items").update({ quantity: newQty }).eq("id", pantryItem.id);
        }
      }
      toast({ title: "Marked as cooked! 👨‍🍳", description: "Your pantry has been updated to reflect what was used." });
    } catch {
      toast({ title: "Pantry update issue", description: "Some pantry items may not have been updated.", variant: "destructive" });
    }
  };

  if (loadingHousehold || loadingRecipes) {
    return <div className="page-container"><Header /><main className="page-content"><PageLoading cards={3} /></main></div>;
  }

  const weekDays = getWeekDays(currentWeekStart);
  const slotLabel = browserSlot ? `${getShortDayName(weekDays[browserSlot.day])} ${browserSlot.mealType}` : "";

  return (
    <div className="page-container">
      <Header />

      <main className="page-content">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h1 className="page-heading">Meals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {recipes.length > 0 ? `${recipes.length} recipes in your collection` : "Plan tonight's dinner in seconds"}
            </p>
          </div>
          <MealPlanDownload mealPlan={currentWeekPlan} weekStart={currentWeekStart} calendarRef={calendarRef} />
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="today" className="gap-2">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Today
            </TabsTrigger>
            <TabsTrigger value="recipes" className="gap-2">
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              All Recipes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {householdId && (
              <TonightDinnerCard
                recipe={todaysDinner}
                onSuggest={() => openAiSheet("dinner")}
                onChange={() => openAddSheet("dinner")}
              />
            )}

            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Today</h3>
              <TodayMealsRow
                slots={slots}
                onAdd={(mt) => openAddSheet(mt)}
                onOpen={(r) => setSelectedRecipe(r)}
              />
            </div>

            <Collapsible open={weekOpen} onOpenChange={setWeekOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" size="sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Plan the week
                  </span>
                  {weekOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="relative" data-tour="generate-plan">
                  <Button
                    onClick={() => handleGeneratePlan("full")}
                    disabled={generatingPlan}
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    {generatingPlan ? "Creating your plan..." : "Generate Meal Plan"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    I'll plan meals based on your saved recipes and preferences
                  </p>
                </div>

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
                    onAddClick={handleAddClick}
                    onRegenerateMeal={(dayIndex, mealType) => {
                      if (!householdId) return;
                      regenerateMeals.mutate({ householdId, weekStartDate: format(currentWeekStart, "yyyy-MM-dd"), dayOfWeek: dayIndex, mealType: mealType as "breakfast" | "lunch" | "dinner" });
                    }}
                    onRegenerateDay={(dayIndex) => {
                      if (!householdId) return;
                      regenerateMeals.mutate({ householdId, weekStartDate: format(currentWeekStart, "yyyy-MM-dd"), dayOfWeek: dayIndex });
                    }}
                    onMarkAsCooked={setCookingRecipe}
                  />
                </div>

                {!currentWeekPlan && (
                  <EmptyState
                    icon={UtensilsCrossed}
                    title="No meals planned this week"
                    description="Let AI suggest recipes based on your family's preferences and dietary needs."
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            {recipes.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Your recipe collection is empty"
                description="Generate a meal plan and your AI-created recipes will appear here."
                encouragement="Each recipe is tailored to your household's dietary preferences."
                action={{ label: "Generate Recipes", onClick: () => handleGeneratePlan("full") }}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search recipes..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {CUISINE_FILTERS.map(c => (
                      <Badge key={c} variant={recipeCuisine === c ? "default" : "outline"}
                        className="text-[10px] cursor-pointer shrink-0 hover:bg-primary/10"
                        onClick={() => setRecipeCuisine(recipeCuisine === c ? null : c)}>
                        {c}
                      </Badge>
                    ))}
                    {DIFFICULTY_FILTERS.map(d => (
                      <Badge key={d} variant={recipeDifficulty === d ? "default" : "outline"}
                        className="text-[10px] cursor-pointer shrink-0 capitalize hover:bg-primary/10"
                        onClick={() => setRecipeDifficulty(recipeDifficulty === d ? null : d)}>
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRecipes.map((recipe) => (
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

                {filteredRecipes.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No recipes match your filters</p>
                    <Button variant="link" size="sm" onClick={() => { setRecipeSearch(""); setRecipeCuisine(null); setRecipeDifficulty(null); }}>
                      Clear filters
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {householdId && (
        <>
          <AddMealSheet
            open={addSheet.open}
            onOpenChange={(o) => setAddSheet((s) => ({ ...s, open: o }))}
            householdId={householdId}
            weekStartDate={format(currentWeekStart, "yyyy-MM-dd")}
            dayOfWeek={todayIndex}
            mealType={addSheet.mealType}
            onPickAi={() => openAiSheet(addSheet.mealType)}
            onPickBrowse={() => openBrowseForToday(addSheet.mealType)}
          />
          <AiSuggestSheet
            open={aiSheet.open}
            onOpenChange={(o) => setAiSheet((s) => ({ ...s, open: o }))}
            householdId={householdId}
            weekStartDate={format(currentWeekStart, "yyyy-MM-dd")}
            dayOfWeek={todayIndex}
            mealType={aiSheet.mealType}
          />
        </>
      )}

      <RecipeBrowserSheet
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        recipes={recipes}
        slotLabel={slotLabel}
        onAssign={handleAssignFromBrowser}
      />

      <RecipeDetailDialog recipe={selectedRecipe} open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)} onRate={setRatingRecipe} />
      <RecipeRatingDialog recipe={ratingRecipe} open={!!ratingRecipe} onOpenChange={(open) => !open && setRatingRecipe(null)} onRate={handleRate} onHide={handleHide} onRemoveFromWeek={handleRemoveFromWeek} />
      <MarkAsCookedDialog open={!!cookingRecipe} onOpenChange={(open) => !open && setCookingRecipe(null)} recipeName={cookingRecipe?.title || ""} ingredients={cookingRecipe?.ingredients || []} onConfirm={handleMarkAsCooked} />
      <ConfirmDialog open={!!deleteRecipeId} onOpenChange={(open) => !open && setDeleteRecipeId(null)} title="Delete this recipe?" description="This recipe will be permanently removed from your collection." confirmLabel="Delete Recipe" variant="destructive" onConfirm={confirmDeleteRecipe} />
    </div>
  );
};

import { ModuleSetupGate } from "@/components/onboarding/ModuleSetupGate";
const MealsWithGate = () => (
  <ModuleSetupGate module="meals_setup">
    <Meals />
  </ModuleSetupGate>
);
export default MealsWithGate;
