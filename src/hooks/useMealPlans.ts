import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ["meal-plans", householdId, weekStartDate],
    queryFn: async () => {
      if (!householdId) return [];

      let query = supabase
        .from("meal_plans")
        .select(`
          *,
          items:meal_plan_items(
            *,
            recipe:recipes(*)
          )
        `)
        .eq("household_id", householdId)
        .order("week_start_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (weekStartDate) {
        query = query.eq("week_start_date", weekStartDate).limit(1);
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
      if (!user?.id) throw new Error("Not authenticated");

      // Step 1: Upsert plan header — safe even if it already exists
      const { data: mealPlan, error: planError } = await supabase
        .from("meal_plans")
        .upsert(
          { household_id: householdId, week_start_date: weekStartDate, created_by: user.id },
          { onConflict: "household_id,week_start_date" }
        )
        .select()
        .single();
      if (planError) {
        console.error("[createMealPlan] meal_plans upsert failed", planError);
        throw planError;
      }

      // Step 2: Delete old items — plan row exists so this is safe
      const { error: deleteError } = await supabase
        .from("meal_plan_items")
        .delete()
        .eq("meal_plan_id", mealPlan.id);
      if (deleteError) throw deleteError;

      // Step 3: Insert new items
      if (items.length > 0) {
        const itemsWithPlanId = items.map(item => ({
          ...item,
          meal_plan_id: mealPlan.id,
        }));
        const { error: itemsError } = await supabase
          .from("meal_plan_items")
          .insert(itemsWithPlanId);
        if (itemsError) throw itemsError;
      }

      return mealPlan;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      toast({
        title: "Meal plan created",
        description: "Your meal plan has been saved successfully.",
      });

      // Send meal plan summary email
      try {
        await supabase.functions.invoke("send-meal-plan-summary", {
          body: {
            mealPlanId: data.id,
            householdId: householdId,
          },
        });
      } catch (error) {
        console.error("Failed to send meal plan summary email:", error);
      }
    },
    onError: (error: any) => {
      console.error("Create meal plan error:", error);
      toast({
        title: "Couldn't save meal plan",
        description: "Please try again.",
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
      const { data, error } = await supabase
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
      console.error("Update meal plan item error:", error);
      toast({
        title: "Couldn't update this meal",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMealPlanItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
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
      console.error("Delete meal plan item error:", error);
      toast({
        title: "Couldn't remove this meal",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMealPlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
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
      console.error("Delete meal plan error:", error);
      toast({
        title: "Couldn't delete this plan",
        description: "Please try again.",
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
