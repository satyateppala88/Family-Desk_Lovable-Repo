import { useMemo } from "react";
import { PantryItem } from "./usePantryItems";

export const usePantryAnalytics = (pantryItems: PantryItem[]) => {
  const analytics = useMemo(() => {
    // Category distribution
    const categoryDistribution = pantryItems.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryDistribution).map(
      ([name, value]) => ({ name, value })
    );

    // Health metrics
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const expiringItems = pantryItems.filter((item) => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= threeDaysFromNow && expiryDate >= now;
    });

    const lowStockItems = pantryItems.filter((item) => {
      const qty = item.quantity || 0;
      const minQty = item.minimum_quantity || 0;
      return minQty > 0 && qty <= minQty;
    });

    const stapleItems = pantryItems.filter((item) => item.is_staple);

    // Expiry timeline
    const expiryTimeline = pantryItems
      .filter((item) => item.expiry_date)
      .map((item) => ({
        name: item.name,
        date: new Date(item.expiry_date!),
        daysUntilExpiry: Math.ceil(
          (new Date(item.expiry_date!).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      totalItems: pantryItems.length,
      categoryData,
      expiringCount: expiringItems.length,
      expiringItems,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      stapleCount: stapleItems.length,
      expiryTimeline,
    };
  }, [pantryItems]);

  return analytics;
};
