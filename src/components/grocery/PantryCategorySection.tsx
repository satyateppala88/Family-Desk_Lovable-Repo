import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PantryItemCard } from "./PantryItemCard";
import { PantryItem } from "@/hooks/usePantryItems";

interface PantryCategorySectionProps {
  categoryName: string;
  categoryIcon?: string;
  items: PantryItem[];
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export const PantryCategorySection = ({
  categoryName,
  categoryIcon,
  items,
  onEdit,
  onDelete,
  onUpdateQuantity,
}: PantryCategorySectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between px-4 py-3 h-auto hover:bg-accent/50"
      >
        <div className="flex items-center gap-3">
          {categoryIcon && <span className="text-2xl">{categoryIcon}</span>}
          <div className="text-left">
            <h3 className="font-semibold text-lg">{categoryName}</h3>
            <p className="text-sm text-muted-foreground">{items.length} items</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {items.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateQuantity={onUpdateQuantity}
            />
          ))}
        </div>
      )}
    </div>
  );
};
