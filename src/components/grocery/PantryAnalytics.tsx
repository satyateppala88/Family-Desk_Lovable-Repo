import { PantryItem } from "@/hooks/usePantryItems";
import { ShoppingList } from "@/hooks/useShoppingLists";
import { usePantryAnalytics } from "@/hooks/usePantryAnalytics";
import { CategoryDistributionChart } from "./CategoryDistributionChart";
import { InventoryHealthCard } from "./InventoryHealthCard";
import { UsageInsights } from "./UsageInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface PantryAnalyticsProps {
  pantryItems: PantryItem[];
  shoppingLists: ShoppingList[];
}

export const PantryAnalytics = ({
  pantryItems,
  shoppingLists,
}: PantryAnalyticsProps) => {
  const analytics = usePantryAnalytics(pantryItems);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryHealthCard
          totalItems={analytics.totalItems}
          expiringCount={analytics.expiringCount}
          lowStockCount={analytics.lowStockCount}
          stapleCount={analytics.stapleCount}
        />
        <CategoryDistributionChart data={analytics.categoryData} />
      </div>

      <UsageInsights shoppingLists={shoppingLists} />

      {analytics.expiryTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expiry Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.expiryTimeline.slice(0, 10).map((item, index) => {
                const isExpiringSoon = item.daysUntilExpiry <= 3;
                const isExpired = item.daysUntilExpiry < 0;

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isExpired
                        ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                        : isExpiringSoon
                        ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20"
                        : "bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar
                        className={`h-4 w-4 ${
                          isExpired
                            ? "text-red-600"
                            : isExpiringSoon
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(item.date, "MMM d, yyyy")}
                      </p>
                      <p
                        className={`text-xs ${
                          isExpired
                            ? "text-red-600"
                            : isExpiringSoon
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isExpired
                          ? `Expired ${Math.abs(item.daysUntilExpiry)} days ago`
                          : item.daysUntilExpiry === 0
                          ? "Expires today"
                          : `${item.daysUntilExpiry} days left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
