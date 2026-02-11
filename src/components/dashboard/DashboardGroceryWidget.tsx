import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface DashboardGroceryWidgetProps {
  pantryItemsCount: number;
}

export const DashboardGroceryWidget = ({ pantryItemsCount }: DashboardGroceryWidgetProps) => {
  return (
    <Link to="/grocery" className="block">
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle>Grocery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-semibold">{pantryItemsCount}</p>
              <p className="text-xs text-muted-foreground">Pantry items</p>
            </div>
            <p className="text-xs text-muted-foreground pt-1">Manage grocery →</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
