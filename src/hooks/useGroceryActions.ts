import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePantryItems, type PantryItem } from "@/hooks/usePantryItems";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { decodeIngredientsParam } from "@/lib/meals/shoppingListBridge";

/**
 * useGroceryActions
 *
 * Owns all cross-tab grocery handlers and derived values so Grocery.tsx
 * stays a thin coordinator. Internally subscribes to pantry items and
 * shopping lists (queries are cached, so child tabs re-using the same
 * hooks share data without extra network cost).
 */
export function useGroceryActions(
  householdId: string | null,
  userId: string | undefined,
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { pantryItems, bulkAddItems, updatePantryItem } =
    usePantryItems(householdId);
  const { shoppingLists } = useShoppingLists(householdId);

  const [cartItemCount, setCartItemCount] = useState(0);
  const [isAddingLowStock, setIsAddingLowStock] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);

  // Deep-link handler: /grocery?tab=shopping&newList=...&items=...
  useEffect(() => {
    const newList = searchParams.get("newList");
    const items = searchParams.get("items");
    if (!newList || !householdId || !userId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: list, error } = await supabase
          .from("shopping_lists")
          .insert([
            {
              household_id: householdId,
              name: newList,
              created_by: userId,
              status: "active",
            },
          ])
          .select()
          .single();
        if (error || !list) throw error;

        const ingredients = decodeIngredientsParam(items);
        if (ingredients.length > 0) {
          const rows = ingredients.map((ing) => ({
            list_id: (list as any).id,
            name: ing.name,
            quantity: ing.quantity
              ? Number(String(ing.quantity).replace(/[^0-9.]/g, "")) || null
              : null,
            unit: ing.unit || null,
            category: null,
            is_checked: false,
            pantry_item_id: null,
            recipe_source: newList,
          }));
          await supabase.from("shopping_list_items").insert(rows);
        }
        if (cancelled) return;
        queryClient.invalidateQueries({
          queryKey: ["shopping-lists", householdId],
        });
        toast({ title: "Shopping list created", description: newList });
        const next = new URLSearchParams(searchParams);
        next.delete("newList");
        next.delete("items");
        next.set("tab", "shopping");
        next.set("list", (list as any).id);
        setSearchParams(next, { replace: true });
      } catch {
        toast({
          title: "Couldn't create list",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, userId]);

  const handleAddLowStockItem = useCallback(
    async (item: PantryItem) => {
      if (!householdId || !userId) return;
      setIsAddingLowStock(true);
      try {
        let activeList = shoppingLists.find((l) => l.status === "active");
        if (!activeList) {
          const { data, error } = await supabase
            .from("shopping_lists")
            .insert([
              {
                household_id: householdId,
                name: `Shopping List — ${new Date().toLocaleDateString()}`,
                created_by: userId,
                status: "active",
              },
            ])
            .select()
            .single();
          if (error || !data) throw error;
          activeList = data as any;
        }

        const existing = activeList!.items?.find(
          (i) => i.pantry_item_id === item.id && !i.is_checked,
        );
        if (existing) {
          toast({ title: "Already on your list", description: item.name });
          return;
        }

        const need = Math.max(
          1,
          Math.ceil((item.minimum_quantity || 1) - (item.quantity || 0)),
        );
        const { error: insertError } = await supabase
          .from("shopping_list_items")
          .insert([
            {
              list_id: activeList!.id,
              name: item.name,
              quantity: need,
              unit: item.unit,
              category: item.category,
              is_checked: false,
              pantry_item_id: item.id,
              recipe_source: null,
            },
          ]);
        if (insertError) throw insertError;

        queryClient.invalidateQueries({
          queryKey: ["shopping-lists", householdId],
        });
        setCartItemCount((c) => c + 1);
        toast({ title: `${item.name} added to shopping list` });
      } catch {
        toast({
          title: "Couldn't add item",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsAddingLowStock(false);
      }
    },
    [householdId, userId, shoppingLists, queryClient, toast],
  );

  const handleAddToCart = useCallback(
    async (itemIds: string[]) => {
      if (!householdId || !userId) return;

      let activeList = shoppingLists.find((list) => list.status === "active");

      if (!activeList) {
        const { data, error } = await supabase
          .from("shopping_lists")
          .insert([
            {
              household_id: householdId,
              name: `Shopping List — ${new Date().toLocaleDateString()}`,
              created_by: userId,
              status: "active",
            },
          ])
          .select()
          .single();

        if (error) {
          toast({
            title: "Something went wrong",
            description: "Couldn't create a shopping list.",
            variant: "destructive",
          });
          return;
        }

        activeList = data as any;
        queryClient.invalidateQueries({
          queryKey: ["shopping-lists", householdId],
        });
      }

      const itemsToAdd = pantryItems.filter((item) => itemIds.includes(item.id));

      const shoppingItems = itemsToAdd.map((item) => ({
        list_id: activeList!.id,
        name: item.name,
        quantity: item.minimum_quantity || 1,
        unit: item.unit,
        category: item.category,
        is_checked: false,
        pantry_item_id: item.id,
        recipe_source: null,
      }));

      const { error: itemsError } = await supabase
        .from("shopping_list_items")
        .insert(shoppingItems);

      if (itemsError) {
        toast({
          title: "Something went wrong",
          description: "Couldn't add items to the list.",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["shopping-lists", householdId],
      });
      setCartItemCount((prev) => prev + itemsToAdd.length);

      toast({
        title: "Added to shopping list",
        description: `${itemsToAdd.length} item${itemsToAdd.length !== 1 ? "s" : ""} ready to buy.`,
      });
    },
    [householdId, userId, shoppingLists, pantryItems, queryClient, toast],
  );

  const handleViewCart = useCallback(() => {
    const activeList = shoppingLists.find((list) => list.status === "active");
    if (activeList) {
      const next = new URLSearchParams(searchParams);
      next.set("list", activeList.id);
      setSearchParams(next);
    }
  }, [shoppingLists, searchParams, setSearchParams]);

  const handleAIImport = useCallback(
    (items: Partial<PantryItem>[]) => {
      if (!householdId || !userId) return;
      const itemsWithRequired = items.map((item) => ({
        ...item,
        household_id: item.household_id || householdId,
        added_by: item.added_by || userId,
      }));
      bulkAddItems.mutate(itemsWithRequired);
    },
    [householdId, userId, bulkAddItems],
  );

  const handleSaveScannedBill = useCallback(
    async ({
      inserts,
      merges,
    }: {
      inserts: Array<Partial<PantryItem>>;
      merges: Array<{ id: string; quantity: number }>;
      billDate: string | null;
    }) => {
      if (!householdId || !userId) return;
      try {
        if (inserts.length > 0) {
          const enriched = inserts.map((i) => ({
            ...i,
            household_id: householdId,
            added_by: userId,
          }));
          await bulkAddItems.mutateAsync(enriched);
        }
        for (const m of merges) {
          await updatePantryItem.mutateAsync({
            id: m.id,
            updates: {
              quantity: m.quantity,
              last_purchased_at: new Date().toISOString(),
            },
          });
        }
        toast({
          title: "Pantry updated",
          description: `${inserts.length} added, ${merges.length} merged.`,
        });
      } catch (err: any) {
        toast({
          title: "Could not save",
          description: "Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [householdId, userId, bulkAddItems, updatePantryItem, toast],
  );

  const handleGenerateFromMealPlan = useCallback(async () => {
    if (!householdId || !userId) return;
    setIsGeneratingList(true);
    try {
      const today = new Date();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - today.getDay());
      const weekStartDate = sunday.toISOString().split("T")[0];

      const { data: mealPlans } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("household_id", householdId)
        .eq("week_start_date", weekStartDate)
        .maybeSingle();

      if (!mealPlans) {
        toast({
          title: "No meal plan found",
          description:
            "Generate a meal plan for this week first, then we can create a shopping list from it.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "generate-shopping-list",
        {
          body: {
            householdId,
            mealPlanId: mealPlans.id,
            userId,
          },
        },
      );

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["shopping-lists", householdId],
      });

      toast({
        title: "Shopping list ready! 🛒",
        description: `${data.itemCount} items added based on this week's meals.`,
      });
    } catch (error) {
      console.error("Error generating shopping list:", error);
      toast({
        title: "Something went wrong",
        description: "We couldn't generate the shopping list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingList(false);
    }
  }, [householdId, userId, queryClient, toast]);

  return {
    pantryItems,
    shoppingLists,
    cartItemCount,
    isAddingLowStock,
    isGeneratingList,
    handleAddLowStockItem,
    handleAddToCart,
    handleViewCart,
    handleAIImport,
    handleSaveScannedBill,
    handleGenerateFromMealPlan,
  };
}