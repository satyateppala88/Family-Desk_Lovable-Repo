import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingProgressData {
  productsSelected: boolean;
  householdBasics: boolean;
  dietaryPreferences: boolean;
  cookingPlanning: boolean;
  householdRoutine: boolean;
  budgetShopping: boolean;
}

export const calculateProgressPercentage = (data: OnboardingProgressData): number => {
  const weights = {
    productsSelected: 20,
    householdBasics: 20,
    dietaryPreferences: 20,
    cookingPlanning: 20,
    householdRoutine: 10,
    budgetShopping: 10,
  };

  let totalPercentage = 0;
  if (data.productsSelected) totalPercentage += weights.productsSelected;
  if (data.householdBasics) totalPercentage += weights.householdBasics;
  if (data.dietaryPreferences) totalPercentage += weights.dietaryPreferences;
  if (data.cookingPlanning) totalPercentage += weights.cookingPlanning;
  if (data.householdRoutine) totalPercentage += weights.householdRoutine;
  if (data.budgetShopping) totalPercentage += weights.budgetShopping;

  return totalPercentage;
};

export const useOnboardingProgress = (householdId: string | null) => {
  return useQuery({
    queryKey: ["onboarding-progress", householdId],
    queryFn: async () => {
      if (!householdId) return { percentage: 0, data: null };

      // Check enabled products
      const { data: productsData } = await supabase
        .from("household_enabled_products")
        .select("product_name")
        .eq("household_id", householdId);

      // Check household preferences
      const { data: prefsData } = await supabase
        .from("household_preferences")
        .select("*")
        .eq("household_id", householdId)
        .maybeSingle();

      const progressData: OnboardingProgressData = {
        productsSelected: (productsData?.length || 0) > 0,
        householdBasics:
          !!prefsData?.family_size_adults &&
          prefsData?.household_type !== null,
        dietaryPreferences:
          !!prefsData?.diet_type &&
          Array.isArray(prefsData?.food_allergies),
        cookingPlanning:
          !!prefsData?.cooking_skill_level &&
          !!prefsData?.weekday_cooking_time &&
          !!prefsData?.pantry_size,
        householdRoutine: !!prefsData?.work_schedule,
        budgetShopping: !!prefsData?.monthly_grocery_budget,
      };

      const percentage = calculateProgressPercentage(progressData);

      return { percentage, data: progressData };
    },
    enabled: !!householdId,
  });
};
