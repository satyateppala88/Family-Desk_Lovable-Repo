import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductName = "tasks" | "meals" | "calendar" | "grocery" | "habits" | "finance";

export const useEnabledProducts = (householdId: string | null) => {
  return useQuery({
    queryKey: ["enabled-products", householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const { data, error } = await supabase
        .from("household_enabled_products")
        .select("*")
        .eq("household_id", householdId);

      if (error) throw error;

      return data.map((p) => p.product_name as ProductName);
    },
    enabled: !!householdId,
    staleTime: 10 * 60 * 1000, // 10 minutes - enabled products rarely change
  });
};

export const isProductEnabled = (
  enabledProducts: ProductName[] | undefined,
  product: ProductName
): boolean => {
  if (!enabledProducts) return false;
  return enabledProducts.includes(product);
};
