import { ArrowLeft, Trash2, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShoppingList } from "@/hooks/useShoppingLists";
import { cn } from "@/lib/utils";
import { groupAndSort } from "@/lib/groceryCategories";
import { ShareOnWhatsAppButton } from "@/components/grocery/ShareOnWhatsAppButton";
import { SwipeRow } from "@/components/ui/SwipeRow";

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
  // Group items by normalised category, with emoji headers and Other last
  const grouped = groupAndSort(list.items || []);
  // Sort: unchecked first within each category
  grouped.forEach((g) => {
    g.items.sort((a, b) => (a.is_checked ? 1 : 0) - (b.is_checked ? 1 : 0));
  });

  const checkedCount = list.items?.filter((item) => item.is_checked).length || 0;
  const totalCount = list.items?.length || 0;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0" style={{ minHeight: "36px" }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">{list.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {list.auto_generated && (
              <Badge variant="outline" className="text-[10px]">From Meal Plan</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{totalCount} items
            </span>
          </div>
        </div>
        <ShareOnWhatsAppButton list={list} size="sm" label="Share" className="shrink-0" />
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <Progress value={progress} className="h-1.5" />
        <p className="text-[11px] text-muted-foreground text-right">{progress}% complete</p>
      </div>

      {/* Category groups */}
      <div className="space-y-4">
        {grouped.map(({ key, label, emoji, items }) => {
          const catChecked = items.filter((i) => i.is_checked).length;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="mr-1.5" aria-hidden>{emoji}</span>
                  {label}
                </h3>
                <span className="text-[10px] text-muted-foreground">{catChecked}/{items.length}</span>
              </div>
              <Card>
                <CardContent className="p-0 divide-y divide-border/50">
                  {items.map((item) => (
                    <SwipeRow
                      key={item.id}
                      radiusClass=""
                      disabled={item.is_checked}
                      actions={[{
                        key: "bought",
                        label: "Bought",
                        icon: <Check className="w-4 h-4" />,
                        bgClass: "bg-[hsl(var(--success))]",
                        onAction: () => onToggleItem(item.id, true),
                      }]}
                    >
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 transition-colors bg-background",
                        item.is_checked && "bg-muted/30"
                      )}
                    >
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(checked) => onToggleItem(item.id, checked as boolean)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          item.is_checked && "line-through text-muted-foreground"
                        )}>
                          {item.name}
                        </p>
                        {(item.quantity || item.recipe_source) && (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {item.quantity && <span>{item.quantity} {item.unit}</span>}
                            {item.recipe_source && <span className="text-primary/60">• {item.recipe_source}</span>}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => onDeleteItem(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        style={{ minHeight: "28px" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    </SwipeRow>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};
