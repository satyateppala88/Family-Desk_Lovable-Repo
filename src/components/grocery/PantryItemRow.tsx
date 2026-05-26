import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";
import { PantryItem } from "@/hooks/usePantryItems";

interface PantryItemRowProps {
  item: PantryItem;
  onQuantityChange?: (id: string, quantity: number) => void;
  onSelect?: (id: string, selected: boolean) => void;
  isOutOfStock?: boolean;
  isSelected?: boolean;
}

export const PantryItemRow = ({
  item,
  onQuantityChange,
  onSelect,
  isOutOfStock = false,
  isSelected = false,
}: PantryItemRowProps) => {
  const [quantity, setQuantity] = useState(item.quantity?.toString() || "0");

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 0) return;
    setQuantity(newQuantity.toString());
    onQuantityChange?.(item.id, newQuantity);
  };

  const handleInputChange = (value: string) => {
    setQuantity(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onQuantityChange?.(item.id, numValue);
    }
  };

  // Determine status badges
  const getStatusBadges = () => {
    const badges = [];
    
    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date);
      const now = new Date();
      const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        badges.push(
          <Badge key="expired" variant="destructive" className="text-xs">
            Expired
          </Badge>
        );
      } else if (diffDays <= 7) {
        badges.push(
          <Badge key="expiring" className="text-xs bg-orange-500 hover:bg-orange-600">
            Expiring Soon
          </Badge>
        );
      }
    }
    
    if (!isOutOfStock) {
      const qty = item.quantity || 0;
      const minQty = item.minimum_quantity || 0;
      if (minQty > 0 && qty <= minQty) {
        badges.push(
          <Badge key="low" className="text-xs bg-yellow-500 hover:bg-yellow-600">
            Low Stock
          </Badge>
        );
      }
    }
    
    return badges;
  };

  const statusBadges = getStatusBadges();

  if (isOutOfStock) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(item.id, checked as boolean)}
        />
        <div className="flex-1">
          <span className="font-medium">{item.name}</span>
          {item.category && (
            <span className="text-sm text-muted-foreground ml-2">
              ({item.category})
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{item.name}</span>
          {statusBadges}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(parseFloat(quantity) - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <Input
          type="number" inputMode="numeric"
          value={quantity}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-20 text-center h-8"
          min="0"
          step="0.1"
        />
        
        <span className="text-sm text-muted-foreground min-w-[40px]">
          {item.unit || ""}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(parseFloat(quantity) + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
