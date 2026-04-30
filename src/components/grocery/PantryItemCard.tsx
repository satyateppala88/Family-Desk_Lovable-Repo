import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
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
    if (diffDays < 0) return { className: "text-destructive bg-destructive/10 border-destructive/20", text: "Expired" };
    if (diffDays <= 3) return { className: "text-warning bg-warning/10 border-warning/20", text: `${diffDays}d left` };
    if (diffDays <= 7) return { className: "text-muted-foreground bg-muted border-border", text: `${diffDays}d left` };
    return null;
  };

  const isLowStock = () => {
    const qty = item.quantity || 0;
    const minQty = item.minimum_quantity || 0;
    return minQty > 0 && qty <= minQty;
  };

  const expiryStatus = getExpiryStatus();
  const lowStock = isLowStock();

  return (
    <Card className={cn("transition-all hover:shadow-md group", lowStock && "border-warning/30")}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Quantity controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="icon" variant="outline" onClick={() => onUpdateQuantity(item.id, Math.max(0, (item.quantity || 0) - 1))}
              className="h-8 w-8" style={{ minHeight: "32px" }}>
              <Minus className="h-3 w-3" />
            </Button>
            <div className="text-center min-w-[3rem]">
              <span className="text-sm font-semibold tabular-nums">{item.quantity || 0}</span>
              {item.unit && <span className="text-[10px] text-muted-foreground block">{item.unit}</span>}
            </div>
            <Button size="icon" variant="outline" onClick={() => onUpdateQuantity(item.id, (item.quantity || 0) + 1)}
              className="h-8 w-8" style={{ minHeight: "32px" }}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Name and badges */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{item.name}</h3>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {lowStock && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-warning border-warning/30">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Low
                </Badge>
              )}
              {expiryStatus && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", expiryStatus.className)}>
                  {expiryStatus.text}
                </Badge>
              )}
              {item.is_staple && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Staple</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" onClick={() => onEdit(item)}
              className="h-7 w-7 text-muted-foreground" style={{ minHeight: "28px" }}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive" style={{ minHeight: "28px" }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
