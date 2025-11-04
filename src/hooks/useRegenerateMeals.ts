import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface RegenerateMealsParams {
  householdId: string;
  weekStartDate: string;
  dayOfWeek: number;
  mealType?: "breakfast" | "lunch" | "dinner";
}

export const useRegenerateMeals = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: RegenerateMealsParams) => {
      const { data, error } = await supabase.functions.invoke("regenerate-meals", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["meal-plans", variables.householdId, variables.weekStartDate] 
      });
      
      const scope = variables.mealType 
        ? `${variables.mealType} meal` 
        : "all meals for the day";
      
      toast({
        title: "Meals regenerated",
        description: `Successfully regenerated ${scope}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate meals",
        variant: "destructive",
      });
    },
  });
};
