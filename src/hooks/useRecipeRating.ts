import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export const useRecipeRating = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rateRecipe = useMutation({
    mutationFn: async ({ 
      recipeId, 
      rating 
    }: { 
      recipeId: string; 
      rating: number 
    }) => {
      // Get current recipe data
      const { data: recipe, error: fetchError } = await supabase
        .from("recipes")
        .select("rating, rating_count")
        .eq("id", recipeId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new rating
      const currentRating = recipe.rating || 0;
      const currentCount = recipe.rating_count || 0;
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + rating) / newCount;

      // Update recipe
      const { data, error } = await supabase
        .from("recipes")
        .update({
          rating: newRating,
          rating_count: newCount,
        })
        .eq("id", recipeId)
        .select()
        .single();

      if (error) throw error;
      return { recipe: data, userRating: rating };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      
      toast({
        title: "Rating submitted",
        description: `You rated this recipe ${data.userRating} star${data.userRating !== 1 ? 's' : ''}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const hideRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      const { data, error } = await supabase
        .from("recipes")
        .update({ hidden: true })
        .eq("id", recipeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      toast({
        title: "Recipe hidden",
        description: "This recipe won't appear in future meal plans.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const unhideRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      const { data, error } = await supabase
        .from("recipes")
        .update({ hidden: false })
        .eq("id", recipeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      toast({
        title: "Recipe unhidden",
        description: "This recipe can now appear in meal plans again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    rateRecipe,
    hideRecipe,
    unhideRecipe,
  };
};
