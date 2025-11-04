import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export const useRecipes = (householdId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await (supabase as any)
        .from("recipes")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Recipe[];
    },
    enabled: !!householdId,
  });

  const createRecipe = useMutation({
    mutationFn: async (newRecipe: Partial<Recipe>) => {
      const { data, error } = await (supabase as any)
        .from("recipes")
        .insert(newRecipe)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      toast({
        title: "Recipe saved",
        description: "Your recipe has been added to the collection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRecipe = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Recipe> }) => {
      const { data, error } = await (supabase as any)
        .from("recipes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      toast({
        title: "Recipe updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("recipes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      toast({
        title: "Recipe deleted",
        description: "The recipe has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    recipes: recipes || [],
    isLoading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
};
