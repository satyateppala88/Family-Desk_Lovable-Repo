import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const usePantryStats = (householdId: string | null) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["pantry-stats", householdId],
    queryFn: async () => {
      if (!householdId) {
        return {
          totalItems: 0,
          expiringCount: 0,
          lowStockCount: 0,
        };
      }

      // Get all pantry items
      const { data: items, error } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("household_id", householdId);

      if (error) throw error;

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      // Count expiring items (within 3 days)
      const expiringCount = items.filter((item) => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        return expiryDate <= threeDaysFromNow && expiryDate >= now;
      }).length;

      // Count low stock items
      const lowStockCount = items.filter((item) => {
        const qty = item.quantity || 0;
        const minQty = item.minimum_quantity || 0;
        return minQty > 0 && qty <= minQty;
      }).length;

      return {
        totalItems: items.length,
        expiringCount,
        lowStockCount,
      };
    },
    enabled: !!householdId,
  });

  return {
    stats: stats || { totalItems: 0, expiringCount: 0, lowStockCount: 0 },
    isLoading,
  };
};
