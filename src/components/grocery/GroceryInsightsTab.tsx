import { ExpiringItemsAlert } from "./ExpiringItemsAlert";
import { LowStockAlert } from "./LowStockAlert";
import { PantryAnalytics } from "./PantryAnalytics";
import { PantryEducationBanner } from "./PantryEducationBanner";
import { usePantryItems } from "@/hooks/usePantryItems";
import { useShoppingLists } from "@/hooks/useShoppingLists";

interface GroceryInsightsTabProps {
  householdId: string | null;
}

export const GroceryInsightsTab = ({ householdId }: GroceryInsightsTabProps) => {
  const { pantryItems } = usePantryItems(householdId);
  const { shoppingLists } = useShoppingLists(householdId);

  const expiringItems = pantryItems.filter((item) => {
    if (!item.expiry_date) return false;
    const expiryDate = new Date(item.expiry_date);
    const now = new Date();
    const diffDays = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays <= 3 && diffDays >= 0;
  });

  const lowStockItems = pantryItems.filter((item) => {
    const qty = item.quantity || 0;
    const minQty = item.minimum_quantity || 0;
    return minQty > 0 && qty <= minQty;
  });

  return (
    <>
      <PantryEducationBanner />
      {expiringItems.length > 0 && <ExpiringItemsAlert items={expiringItems} />}
      {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}
      <PantryAnalytics pantryItems={pantryItems} shoppingLists={shoppingLists} />
    </>
  );
};