import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string;
  day_of_week: number;
  meal_type: "breakfast" | "lunch" | "dinner";
  scheduled_date: string | null;
  notes: string | null;
  recipe?: any;
}

export interface MealPlan {
  id: string;
  household_id: string;
  week_start_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: MealPlanItem[];
}

export const useMealPlans = (householdId: string | null, weekStartDate?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ["meal-plans", householdId, weekStartDate],
    queryFn: async () => {
      if (!householdId) return [];

      let query = (supabase as any)
        .from("meal_plans")
        .select(`
          *,
          items:meal_plan_items(
            *,
            recipe:recipes(*)
          )
        `)
        .eq("household_id", householdId)
        .order("week_start_date", { ascending: false });

      if (weekStartDate) {
        query = query.eq("week_start_date", weekStartDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MealPlan[];
    },
    enabled: !!householdId,
  });

  const createMealPlan = useMutation({
    mutationFn: async ({ 
      weekStartDate, 
      items 
    }: { 
      weekStartDate: string; 
      items: Omit<MealPlanItem, "id" | "meal_plan_id">[] 
    }) => {
      if (!householdId) throw new Error("No household ID");

      // Create the meal plan
      const { data: mealPlan, error: planError } = await (supabase as any)
        .from("meal_plans")
        .insert({
          household_id: householdId,
          week_start_date: weekStartDate,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create the meal plan items
      const itemsWithPlanId = items.map(item => ({
        ...item,
        meal_plan_id: mealPlan.id,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("meal_plan_items")
        .insert(itemsWithPlanId);

      if (itemsError) throw itemsError;

      return mealPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      toast({
        title: "Meal plan created",
        description: "Your meal plan has been saved successfully.",
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

  const updateMealPlanItem = useMutation({
    mutationFn: async ({ 
      itemId, 
      updates 
    }: { 
      itemId: string; 
      updates: Partial<MealPlanItem> 
    }) => {
      const { data, error } = await (supabase as any)
        .from("meal_plan_items")
        .update(updates)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMealPlanItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any)
        .from("meal_plan_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      toast({
        title: "Meal removed",
        description: "The meal has been removed from your plan.",
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

  const deleteMealPlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await (supabase as any)
        .from("meal_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      toast({
        title: "Meal plan deleted",
        description: "The meal plan has been deleted.",
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
    mealPlans: mealPlans || [],
    currentWeekPlan: mealPlans?.[0] || null,
    isLoading,
    createMealPlan,
    updateMealPlanItem,
    deleteMealPlanItem,
    deleteMealPlan,
  };
};
