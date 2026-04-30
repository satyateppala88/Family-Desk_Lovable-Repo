import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { PantryItemRow } from "./PantryItemRow";
import { PantryItem } from "@/hooks/usePantryItems";

interface PantryCategoryDetailProps {
  categoryName: string;
  categoryIcon?: string;
  items: PantryItem[];
  onBack: () => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onAddToCart: (itemIds: string[]) => void;
}

export const PantryCategoryDetail = ({
  categoryName,
  categoryIcon,
  items,
  onBack,
  onQuantityChange,
  onAddToCart,
}: PantryCategoryDetailProps) => {
  const [selectedOutOfStock, setSelectedOutOfStock] = useState<Set<string>>(new Set());

  // Split items into in-stock and out-of-stock
  const { inStockItems, outOfStockItems } = useMemo(() => {
    const inStock: PantryItem[] = [];
    const outOfStock: PantryItem[] = [];
    
    items.forEach((item) => {
      const qty = item.quantity || 0;
      if (qty > 0) {
        inStock.push(item);
      } else {
        outOfStock.push(item);
      }
    });
    
    return { inStockItems: inStock, outOfStockItems: outOfStock };
  }, [items]);

  const handleSelectOutOfStock = (itemId: string, selected: boolean) => {
    const newSelected = new Set(selectedOutOfStock);
    if (selected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedOutOfStock(newSelected);
  };

  const handleAddToCart = () => {
    if (selectedOutOfStock.size > 0) {
      onAddToCart(Array.from(selectedOutOfStock));
      setSelectedOutOfStock(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {categoryIcon && <span className="text-3xl">{categoryIcon}</span>}
          <h2 className="text-2xl font-bold">{categoryName}</h2>
        </div>
      </div>

      {/* In Stock Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          IN STOCK ({inStockItems.length})
        </h3>
        {inStockItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No items in stock
          </p>
        ) : (
          <div className="space-y-2">
            {inStockItems.map((item) => (
              <PantryItemRow
                key={item.id}
                item={item}
                onQuantityChange={onQuantityChange}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Out of Stock Section */}
      {outOfStockItems.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              OUT OF STOCK ({outOfStockItems.length})
            </h3>
            {selectedOutOfStock.size > 0 && (
              <Button
                onClick={handleAddToCart}
                className="gap-2"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Add Selected ({selectedOutOfStock.size})
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {outOfStockItems.map((item) => (
              <PantryItemRow
                key={item.id}
                item={item}
                isOutOfStock
                isSelected={selectedOutOfStock.has(item.id)}
                onSelect={handleSelectOutOfStock}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
