import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface ShoppingListItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  pantry_item_id: string | null;
  recipe_source: string | null;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  household_id: string;
  name: string;
  status: "active" | "completed" | "archived";
  auto_generated: boolean;
  meal_plan_id: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  items?: ShoppingListItem[];
}

export const useShoppingLists = (householdId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shoppingLists, isLoading } = useQuery({
    queryKey: ["shopping-lists", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("shopping_lists")
        .select(`
          *,
          items:shopping_list_items(*)
        `)
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ShoppingList[];
    },
    enabled: !!householdId,
  });

  const createShoppingList = useMutation({
    mutationFn: async (list: { household_id: string; name: string; created_by: string }) => {
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert([list])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
      toast({
        title: "List created",
        description: "Shopping list has been created successfully.",
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

  const addItemToList = useMutation({
    mutationFn: async (item: Omit<ShoppingListItem, "id" | "created_at" | "checked_by" | "checked_at">) => {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkAddItems = useMutation({
    mutationFn: async (items: Omit<ShoppingListItem, "id" | "created_at" | "checked_by" | "checked_at">[]) => {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
      toast({
        title: "Items added",
        description: `${data.length} items added to shopping list.`,
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

  const toggleItemChecked = useMutation({
    mutationFn: async ({ id, is_checked, user_id }: { id: string; is_checked: boolean; user_id: string }) => {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .update({
          is_checked,
          checked_by: is_checked ? user_id : null,
          checked_at: is_checked ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeShoppingList = useMutation({
    mutationFn: async (listId: string) => {
      const { data, error } = await supabase
        .from("shopping_lists")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", listId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
      toast({
        title: "List completed",
        description: "Shopping list marked as completed.",
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

  const deleteShoppingList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from("shopping_lists")
        .delete()
        .eq("id", listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
      toast({
        title: "List deleted",
        description: "Shopping list has been removed.",
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

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
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
    shoppingLists: shoppingLists || [],
    isLoading,
    createShoppingList,
    addItemToList,
    bulkAddItems,
    toggleItemChecked,
    completeShoppingList,
    deleteShoppingList,
    deleteItem,
  };
};
