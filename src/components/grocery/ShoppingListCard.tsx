import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ShoppingList } from "@/hooks/useShoppingLists";

interface ShoppingListCardProps {
  list: ShoppingList;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

export const ShoppingListCard = ({ list, onDelete, onComplete }: ShoppingListCardProps) => {
  const totalItems = list.items?.length || 0;
  const checkedItems = list.items?.filter(item => item.is_checked).length || 0;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const getStatusColor = () => {
    if (list.status === "completed") return "bg-green-500";
    if (list.status === "archived") return "bg-gray-500";
    return "bg-blue-500";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5" />
              {list.name}
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant={list.status === "completed" ? "default" : "secondary"}>
                {list.status}
              </Badge>
              {list.auto_generated && (
                <Badge variant="outline">Auto-generated</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {list.status === "active" && totalItems === checkedItems && totalItems > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onComplete(list.id)}
                className="h-8 w-8 text-green-600 hover:text-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(list.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {checkedItems} / {totalItems} items
            </span>
          </div>
          
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getStatusColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <Link to={`/grocery?list=${list.id}`}>
            <Button variant="outline" className="w-full mt-2">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
