import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Recipe } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export const useRecipes = (householdId: string | null, pagination?: PaginationParams) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ["recipes", householdId, page, pageSize],
    queryFn: async () => {
      if (!householdId) return { recipes: [], totalCount: 0 };

      const { data, error, count } = await supabase
        .from("recipes")
        .select("*", { count: "exact" })
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      return { recipes: data as Recipe[], totalCount: count || 0 };
    },
    enabled: !!householdId,
    staleTime: 60 * 1000, // 1 minute
  });

  const createRecipe = useMutation({
    mutationFn: async (newRecipe: Partial<Recipe>) => {
      const { data, error } = await supabase
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
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateRecipe = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Recipe> }) => {
      const { data, error } = await supabase
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
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
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
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    recipes: data?.recipes || [],
    totalCount: data?.totalCount || 0,
    totalPages: Math.ceil((data?.totalCount || 0) / pageSize),
    currentPage: page,
    pageSize,
    isLoading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
};
