import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface DashboardGroceryWidgetProps {
  pantryItemsCount: number;
}

export const DashboardGroceryWidget = ({ pantryItemsCount }: DashboardGroceryWidgetProps) => {
  return (
    <Link to="/grocery" className="block hover:scale-[1.02] transition-transform">
      <Card className="h-full border-l-4 border-l-[hsl(145,65%,45%)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" style={{ color: "hsl(145, 65%, 45%)" }} />
              <span>Grocery</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-1 bg-muted rounded-md">
              <p className="text-xl font-bold">{pantryItemsCount}</p>
              <p className="text-xs text-muted-foreground">Pantry Items</p>
            </div>
            <div className="text-center p-1 bg-muted rounded-md">
              <p className="text-xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Shopping Lists</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1 text-sm font-medium mt-2" style={{ color: "hsl(145, 65%, 45%)" }}>
            Manage grocery <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
