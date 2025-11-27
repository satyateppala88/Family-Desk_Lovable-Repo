import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface PantryCategory {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

// Pre-defined categories for Indian households
export const DEFAULT_CATEGORIES = [
  { name: "Grains & Lentils", icon: "🌾", sort_order: 1 },
  { name: "Spices & Masalas", icon: "🌶️", sort_order: 2 },
  { name: "Dairy & Eggs", icon: "🥛", sort_order: 3 },
  { name: "Vegetables", icon: "🥬", sort_order: 4 },
  { name: "Fruits", icon: "🍎", sort_order: 5 },
  { name: "Oils & Ghee", icon: "🧈", sort_order: 6 },
  { name: "Snacks & Packaged Foods", icon: "🍪", sort_order: 7 },
  { name: "Beverages", icon: "☕", sort_order: 8 },
  { name: "Frozen Items", icon: "🧊", sort_order: 9 },
  { name: "Other", icon: "📦", sort_order: 10 },
];

export const usePantryCategories = (householdId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["pantry-categories", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("pantry_categories")
        .select("*")
        .eq("household_id", householdId)
        .order("sort_order");

      if (error) throw error;
      return data as PantryCategory[];
    },
    enabled: !!householdId,
  });

  const initializeDefaultCategories = useMutation({
    mutationFn: async (householdId: string) => {
      const categoriesToInsert = DEFAULT_CATEGORIES.map((cat) => ({
        household_id: householdId,
        ...cat,
      }));

      const { data, error } = await supabase
        .from("pantry_categories")
        .insert(categoriesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry-categories", householdId] });
    },
  });

  const addCategory = useMutation({
    mutationFn: async (category: Omit<PantryCategory, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("pantry_categories")
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry-categories", householdId] });
      toast({
        title: "Category added",
        description: "New category has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    categories: categories || [],
    isLoading,
    initializeDefaultCategories,
    addCategory,
  };
};
