import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, Star, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InventoryHealthCardProps {
  totalItems: number;
  expiringCount: number;
  lowStockCount: number;
  stapleCount: number;
}

export const InventoryHealthCard = ({
  totalItems,
  expiringCount,
  lowStockCount,
  stapleCount,
}: InventoryHealthCardProps) => {
  const healthScore =
    totalItems > 0
      ? Math.round(
          ((totalItems - expiringCount - lowStockCount) / totalItems) * 100
        )
      : 100;

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Health Score</span>
          <Badge
            variant="outline"
            className={`text-lg font-bold ${getHealthColor(healthScore)}`}
          >
            {healthScore}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <Star className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{stapleCount}</p>
              <p className="text-xs text-muted-foreground">Staples</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{expiringCount}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{lowStockCount}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
