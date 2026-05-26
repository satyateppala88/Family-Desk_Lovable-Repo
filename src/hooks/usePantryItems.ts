import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface PantryItem {
  id: string;
  household_id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  location: string | null;
  minimum_quantity: number;
  is_staple: boolean;
  last_purchased_at: string | null;
  average_usage_days: number | null;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export const usePantryItems = (householdId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pantryItems, isLoading } = useQuery({
    queryKey: ["pantry-items", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("household_id", householdId)
        .order("name");

      if (error) throw error;
      return data as PantryItem[];
    },
    enabled: !!householdId,
  });

  const addPantryItem = useMutation({
    mutationFn: async (item: Omit<Partial<PantryItem>, "id" | "created_at" | "updated_at"> & { household_id: string; added_by: string }) => {
      if (!item.name?.trim()) throw new Error('Item name cannot be empty');
      if (item.quantity !== undefined && item.quantity !== null && item.quantity < 0)
        throw new Error('Quantity cannot be negative');

      const { data, error } = await supabase
        .from("pantry_items")
        .insert([item as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry-items", householdId] });
      queryClient.invalidateQueries({ queryKey: ["pantry-stats", householdId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", householdId] });
      toast({
        title: "Item added",
        description: "Pantry item has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePantryItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PantryItem> }) => {
      const { data, error } = await supabase
        .from("pantry_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry-items", householdId] });
      queryClient.invalidateQueries({ queryKey: ["pantry-stats", householdId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", householdId] });
      toast({
        title: "Item updated",
        description: "Pantry item has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePantryItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pantry_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry-items", householdId] });
      queryClient.invalidateQueries({ queryKey: ["pantry-stats", householdId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", householdId] });
      toast({
        title: "Item deleted",
        description: "Pantry item has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkAddItems = useMutation({
    mutationFn: async (items: (Omit<Partial<PantryItem>, "id" | "created_at" | "updated_at"> & { household_id: string; added_by: string })[]) => {
      const { data, error } = await supabase
        .from("pantry_items")
        .insert(items as any[])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pantry-items", householdId] });
      queryClient.invalidateQueries({ queryKey: ["pantry-stats", householdId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats", householdId] });
      // Broad invalidation safety net — catches any pantry list view that
      // cached under a different filter / household-less key (e.g. dashboard
      // snapshot). The count was updating but the list stayed blank because
      // the consuming query key didn't match the household-scoped key above.
      queryClient.invalidateQueries({ queryKey: ["pantry-items"] });
      toast({
        title: "Items added",
        description: `${data.length} items have been added to your pantry.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    pantryItems: pantryItems || [],
    isLoading,
    addPantryItem,
    updatePantryItem,
    deletePantryItem,
    bulkAddItems,
  };
};
