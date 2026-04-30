import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PantryItem } from "@/hooks/usePantryItems";

interface LowStockAlertProps {
  items: PantryItem[];
  onAddToShoppingList?: () => void;
}

export const LowStockAlert = ({ items, onAddToShoppingList }: LowStockAlertProps) => {
  if (items.length === 0) return null;

  return (
    <Alert>
      <PackageX className="h-5 w-5" />
      <AlertTitle>Low Stock Items</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">These items are running low:</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map((item) => (
            <Badge key={item.id} variant="outline">
              {item.name} ({item.quantity || 0} {item.unit || ""})
            </Badge>
          ))}
        </div>
        {onAddToShoppingList && (
          <Button size="sm" variant="outline" onClick={onAddToShoppingList}>
            Add to Shopping List
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
