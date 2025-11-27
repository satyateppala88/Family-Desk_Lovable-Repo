import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PantryItem } from "@/hooks/usePantryItems";

interface ExpiringItemsAlertProps {
  items: PantryItem[];
}

export const ExpiringItemsAlert = ({ items }: ExpiringItemsAlertProps) => {
  if (items.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle>Items Expiring Soon</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">These items will expire within 3 days:</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const expiryDate = new Date(item.expiry_date!);
            const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            return (
              <Badge key={item.id} variant="outline" className="border-destructive">
                {item.name} ({daysLeft}d left)
              </Badge>
            );
          })}
        </div>
        <p className="text-xs mt-2">
          Consider using these items in your next meals to reduce waste.
        </p>
      </AlertDescription>
    </Alert>
  );
};
