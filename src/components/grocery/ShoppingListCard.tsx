import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShoppingCart, Trash2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  const isComplete = list.status === "completed";
  const allChecked = totalItems === checkedItems && totalItems > 0;

  return (
    <Link to={`/grocery?list=${list.id}`} className="block group">
      <Card className={cn(
        "transition-all hover:shadow-md group-hover:scale-[1.01]",
        isComplete && "opacity-60"
      )}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="text-sm font-semibold truncate">{list.name}</h3>
            </div>
            <div className="flex gap-0.5 shrink-0" onClick={(e) => e.preventDefault()}>
              {list.status === "active" && allChecked && (
                <Button size="icon" variant="ghost" onClick={() => onComplete(list.id)}
                  className="h-7 w-7 text-[hsl(var(--success))]" style={{ minHeight: "28px" }}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => onDelete(list.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive" style={{ minHeight: "28px" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{checkedItems} of {totalItems} items</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="flex items-center gap-2">
            {list.auto_generated && (
              <Badge variant="outline" className="text-[10px]">Meal Plan</Badge>
            )}
            <Badge variant={isComplete ? "default" : "secondary"} className="text-[10px] capitalize">
              {list.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
