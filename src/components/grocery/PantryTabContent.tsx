import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Sparkles } from "lucide-react";
import { RunningLowChips } from "./RunningLowChips";
import { PantryCategoryGrid } from "./PantryCategoryGrid";
import { PantryCategoryDetail } from "./PantryCategoryDetail";
import { FloatingCartButton } from "./FloatingCartButton";
import { usePantryItems } from "@/hooks/usePantryItems";
import { usePantryCategories } from "@/hooks/usePantryCategories";

interface PantryTabContentProps {
  householdId: string | null;
  cartItemCount: number;
  isAddingLowStock: boolean;
  onAddLowStockItem: (item: any) => void;
  onAddToCart: (ids: string[]) => Promise<void> | void;
  onViewCart: () => void;
  onShowAddDialog: () => void;
  onShowQuickAdd: () => void;
  onOpenAI: () => void;
}

export const PantryTabContent = ({
  householdId,
  cartItemCount,
  isAddingLowStock,
  onAddLowStockItem,
  onAddToCart,
  onViewCart,
  onShowAddDialog,
  onShowQuickAdd,
  onOpenAI,
}: PantryTabContentProps) => {
  const { pantryItems, isLoading, updatePantryItem } =
    usePantryItems(householdId);
  const { categories, isLoading: categoriesLoading, initializeDefaultCategories } =
    usePantryCategories(householdId);

  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (householdId && categories.length === 0 && !categoriesLoading) {
      initializeDefaultCategories.mutate(householdId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, categories.length, categoriesLoading]);

  const lowStockItems = useMemo(
    () =>
      pantryItems.filter((item) => {
        const qty = item.quantity || 0;
        const minQty = item.minimum_quantity || 0;
        return minQty > 0 && qty <= minQty;
      }),
    [pantryItems],
  );

  const categoryItems = useMemo(() => {
    if (!selectedCategoryDetail) return [];
    return pantryItems.filter(
      (item) =>
        item.category === selectedCategoryDetail ||
        (selectedCategoryDetail === "Other" && !item.category),
    );
  }, [selectedCategoryDetail, pantryItems]);

  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => {
      updatePantryItem.mutate({ id, updates: { quantity } });
    },
    [updatePantryItem],
  );

  return (
    <>
      {lowStockItems.length > 0 && (
        <RunningLowChips
          items={lowStockItems}
          onAddItem={onAddLowStockItem}
          isAdding={isAddingLowStock}
        />
      )}
      {isLoading ? (
        <EmptyState icon={Package} title="Loading your pantry..." />
      ) : pantryItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Your pantry is a blank slate"
          description="Add staples your household always keeps at home. When stock runs low, FamilyDesk will flag it and add items to your shopping list automatically."
          encouragement="Try AI Import to add everything at once!"
          action={{ label: "Add Item", onClick: onShowAddDialog }}
          secondaryAction={{ label: "Quick Add Staples", onClick: onShowQuickAdd }}
        />
      ) : selectedCategoryDetail ? (
        <PantryCategoryDetail
          categoryName={selectedCategoryDetail}
          categoryIcon={categories.find((c) => c.name === selectedCategoryDetail)?.icon || undefined}
          items={categoryItems}
          onBack={() => setSelectedCategoryDetail(null)}
          onQuantityChange={handleUpdateQuantity}
          onAddToCart={onAddToCart}
        />
      ) : (
        <div data-tour="category-grid">
          <PantryCategoryGrid
            categories={categories}
            items={pantryItems}
            onSelectCategory={setSelectedCategoryDetail}
          />
        </div>
      )}

      {pantryItems.length > 0 && !selectedCategoryDetail && (
        <Button variant="outline" onClick={onOpenAI} className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          What am I running low on?
        </Button>
      )}

      <FloatingCartButton itemCount={cartItemCount} onClick={onViewCart} />
    </>
  );
};