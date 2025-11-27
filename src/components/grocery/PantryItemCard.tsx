import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import type { PantryItem } from "@/hooks/usePantryItems";

interface PantryItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export const PantryItemCard = ({ item, onEdit, onDelete, onUpdateQuantity }: PantryItemCardProps) => {
  const getExpiryStatus = () => {
    if (!item.expiry_date) return null;
    
    const now = new Date();
    const expiryDate = new Date(item.expiry_date);
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: "expired", color: "bg-destructive", text: "Expired" };
    if (diffDays <= 3) return { status: "expiring-soon", color: "bg-orange-500", text: `${diffDays}d left` };
    if (diffDays <= 7) return { status: "expiring", color: "bg-yellow-500", text: `${diffDays}d left` };
    return { status: "fresh", color: "bg-green-500", text: `${diffDays}d left` };
  };

  const isLowStock = () => {
    const qty = item.quantity || 0;
    const minQty = item.minimum_quantity || 0;
    return minQty > 0 && qty <= minQty;
  };

  const expiryStatus = getExpiryStatus();
  const lowStock = isLowStock();

  const handleIncrement = () => {
    const newQuantity = (item.quantity || 0) + 1;
    onUpdateQuantity(item.id, newQuantity);
  };

  const handleDecrement = () => {
    const newQuantity = Math.max(0, (item.quantity || 0) - 1);
    onUpdateQuantity(item.id, newQuantity);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">{item.name}</h3>
            <div className="flex flex-wrap gap-2 items-center">
              {item.category && (
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              )}
              {item.is_staple && (
                <Badge variant="outline" className="text-xs">
                  Staple
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(item)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handleDecrement}
              className="h-8 w-8"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-semibold min-w-[60px] text-center">
              {item.quantity || 0} {item.unit || ""}
            </span>
            <Button
              size="icon"
              variant="outline"
              onClick={handleIncrement}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            {lowStock && (
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low Stock
              </Badge>
            )}
            {expiryStatus && (
              <Badge className={expiryStatus.color}>
                {expiryStatus.text}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
