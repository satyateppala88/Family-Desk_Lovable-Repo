import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ShoppingList, ShoppingListItem } from "@/hooks/useShoppingLists";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShoppingListDetailViewProps {
  list: ShoppingList;
  onBack: () => void;
  onToggleItem: (itemId: string, isChecked: boolean) => void;
  onDeleteItem: (itemId: string) => void;
  userId: string;
}

export const ShoppingListDetailView = ({
  list,
  onBack,
  onToggleItem,
  onDeleteItem,
  userId,
}: ShoppingListDetailViewProps) => {
  // Group items by category
  const groupedItems = (list.items || []).reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  const checkedCount = list.items?.filter((item) => item.is_checked).length || 0;
  const totalCount = list.items?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{list.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={list.status === "active" ? "default" : "secondary"}>
              {list.status}
            </Badge>
            {list.auto_generated && (
              <Badge variant="outline">Auto-generated</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {checkedCount} of {totalCount} checked
            </span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={item.is_checked}
                      onCheckedChange={(checked) =>
                        onToggleItem(item.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          item.is_checked
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {item.quantity && (
                          <span>
                            {item.quantity} {item.unit}
                          </span>
                        )}
                        {item.recipe_source && (
                          <Badge variant="outline" className="text-xs">
                            {item.recipe_source}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
