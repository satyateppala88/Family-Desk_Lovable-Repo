import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Sparkles } from "lucide-react";
import { RunningLowChips } from "./RunningLowChips";
import { PantryCategoryGrid } from "./PantryCategoryGrid";
import { PantryCategoryDetail } from "./PantryCategoryDetail";
import { FloatingCartButton } from "./FloatingCartButton";
import type { PantryItem } from "@/hooks/usePantryItems";
import type { PantryCategory } from "@/hooks/usePantryCategories";

interface PantryTabContentProps {
  isLoading: boolean;
  pantryItems: PantryItem[];
  categories: PantryCategory[];
  lowStockItems: PantryItem[];
  selectedCategoryDetail: string | null;
  categoryItems: PantryItem[];
  cartItemCount: number;
  isAddingLowStock: boolean;
  onAddLowStockItem: (item: PantryItem) => void;
  onShowAddDialog: () => void;
  onShowQuickAdd: () => void;
  onSelectCategory: (name: string) => void;
  onBackToCategories: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onAddToCart: (ids: string[]) => Promise<void> | void;
  onViewCart: () => void;
  onOpenAI: () => void;
}

export const PantryTabContent = ({
  isLoading,
  pantryItems,
  categories,
  lowStockItems,
  selectedCategoryDetail,
  categoryItems,
  cartItemCount,
  isAddingLowStock,
  onAddLowStockItem,
  onShowAddDialog,
  onShowQuickAdd,
  onSelectCategory,
  onBackToCategories,
  onUpdateQuantity,
  onAddToCart,
  onViewCart,
  onOpenAI,
}: PantryTabContentProps) => {
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
          onBack={onBackToCategories}
          onQuantityChange={onUpdateQuantity}
          onAddToCart={onAddToCart}
        />
      ) : (
        <div data-tour="category-grid">
          <PantryCategoryGrid
            categories={categories}
            items={pantryItems}
            onSelectCategory={onSelectCategory}
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