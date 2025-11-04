import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { RecipeCard } from "@/components/meals/RecipeCard";
import { RecipeDetailDialog } from "@/components/meals/RecipeDetailDialog";
import { useHousehold } from "@/hooks/useHousehold";
import { useRecipes } from "@/hooks/useRecipes";
import { Recipe } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const Meals = () => {
  const { user } = useAuth();
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const { recipes, isLoading, updateRecipe, deleteRecipe, createRecipe } = useRecipes(householdId);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const { toast } = useToast();

  const handleGeneratePlan = async () => {
    if (!householdId) return;

    setGeneratingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-suggestions", {
        body: {
          householdId,
          numDays: 7,
          preferences: {},
          pantryItems: [],
        },
      });

      if (error) throw error;

      console.log("Generated meal plan:", data);

      // Save recipes to database
      const recipesToSave = data.meals.map((meal: any) => ({
        ...meal.recipe,
        household_id: householdId,
        created_by: user?.id,
        source: "ai_generated",
      }));

      for (const recipe of recipesToSave) {
        await createRecipe.mutateAsync(recipe);
      }

      toast({
        title: "Meal plan generated!",
        description: `Created ${recipesToSave.length} AI-powered recipes for your week.`,
      });
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

  const handleToggleFavorite = (id: string, isFavorite: boolean) => {
    updateRecipe.mutate({ id, updates: { is_favorite: isFavorite } });
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipe.mutate(id);
    }
  };

  if (loadingHousehold || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meal Planning</h1>
          <Button 
            onClick={handleGeneratePlan} 
            size="sm"
            disabled={generatingPlan}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generatingPlan ? "Generating..." : "AI Meal Plan"}
          </Button>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No recipes yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Let AI create a personalized weekly meal plan for your household, or add your own recipes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatingPlan ? "Generating..." : "Generate AI Meal Plan"}
              </Button>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Recipe Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteRecipe}
                onClick={setSelectedRecipe}
              />
            ))}
          </div>
        )}
      </main>

      <MobileNav />

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
      />
    </div>
  );
};

export default Meals;
