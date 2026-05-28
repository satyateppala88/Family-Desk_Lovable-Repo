import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingList } from "@/hooks/useShoppingLists";
import { ShoppingBag, CheckCircle2, TrendingUp } from "lucide-react";

interface UsageInsightsProps {
  shoppingLists: ShoppingList[];
}

export const UsageInsights = ({ shoppingLists }: UsageInsightsProps) => {
  const totalLists = shoppingLists.length;
  const completedLists = shoppingLists.filter(
    (list) => list.status === "completed"
  ).length;
  const completionRate =
    totalLists > 0 ? Math.round((completedLists / totalLists) * 100) : 0;

  const totalItems = shoppingLists.reduce(
    (sum, list) => sum + (list.items?.length || 0),
    0
  );
  const avgItemsPerList = totalLists > 0 ? Math.round(totalItems / totalLists) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shopping Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalLists}</p>
              <p className="text-xs text-muted-foreground">Total Lists</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{avgItemsPerList}</p>
              <p className="text-xs text-muted-foreground">Avg Items/List</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
