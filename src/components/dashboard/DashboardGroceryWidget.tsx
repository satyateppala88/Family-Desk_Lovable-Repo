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
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" style={{ color: "hsl(145, 65%, 45%)" }} />
              <span>Grocery</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pantry items</p>
            <Badge variant="secondary">{pantryItemsCount}</Badge>
          </div>
          <p className="text-2xl font-bold">{pantryItemsCount}</p>
          <p className="text-xs text-muted-foreground">
            Items currently in your pantry
          </p>
          <div className="flex items-center justify-end gap-1 text-sm font-medium mt-4" style={{ color: "hsl(145, 65%, 45%)" }}>
            Manage pantry <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
