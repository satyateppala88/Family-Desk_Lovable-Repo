import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ToastAction } from "@/components/ui/toast";
import { ShoppingCart, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  addIngredientsToShoppingList,
  splitIngredientsByPantry,
  type IngredientLite,
  type PantryLite,
} from "@/lib/meals/groceryHelpers";

interface AddIngredientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeTitle: string;
  ingredients: IngredientLite[];
  householdId: string;
  userId: string;
}

export const AddIngredientsDialog = ({
  open,
  onOpenChange,
  recipeTitle,
  ingredients,
  householdId,
  userId,
}: AddIngredientsDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: pantry = [], isLoading: pantryLoading } = useQuery({
    queryKey: ["pantry-items", householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("id, name, quantity, unit")
        .eq("household_id", householdId);
      if (error) throw error;
      return (data || []) as PantryLite[];
    },
    enabled: open && !!householdId,
  });

  const { missing, inStock } = useMemo(
    () => splitIngredientsByPantry(ingredients, pantry),
    [ingredients, pantry],
  );

  // Pre-select all missing items each time the dialog opens / data refreshes
  useEffect(() => {
    if (open) {
      const next: Record<number, boolean> = {};
      missing.forEach((_, i) => { next[i] = true; });
      setSelected(next);
    }
  }, [open, missing.length]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleAdd = async () => {
    const items = missing.filter((_, i) => selected[i]);
    if (items.length === 0) {
      toast({ title: "Nothing selected", description: "Pick at least one ingredient." });
      return;
    }
    setSubmitting(true);
    try {
      const result = await addIngredientsToShoppingList({
        householdId,
        userId,
        recipeTitle,
        items,
      });
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
      toast({
        title: `${result.added} item${result.added === 1 ? "" : "s"} added to ${result.listName}`,
        description: result.appended ? "Appended to your active list." : "New shopping list created.",
        action: (
          <ToastAction
            altText="View shopping list"
            onClick={() => navigate(`/grocery?tab=shopping&list=${result.listId}`)}
          >
            View list →
          </ToastAction>
        ),
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error("AddIngredientsDialog error:", e);
      toast({
        title: "Couldn't add ingredients",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Missing ingredients for {recipeTitle}
          </DialogTitle>
          <DialogDescription>
            We checked your pantry. Pick what you'd like to add to your shopping list.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 py-2">
          {pantryLoading ? (
            <p className="text-sm text-muted-foreground">Checking your pantry…</p>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  To buy ({missing.length})
                </p>
                {missing.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    You have everything you need. 🎉
                  </p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {missing.map((ing, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-accent/30"
                      >
                        <Checkbox
                          checked={!!selected[i]}
                          onCheckedChange={(v) =>
                            setSelected((s) => ({ ...s, [i]: !!v }))
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ing.name}</p>
                          {(ing.quantity || ing.unit) && (
                            <p className="text-xs text-muted-foreground">
                              {ing.quantity || ""} {ing.unit || ""}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {inStock.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Already in your pantry ({inStock.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {inStock.map((ing, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1">
                        <Check className="w-3 h-3" /> {ing.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={submitting || pantryLoading || selectedCount === 0}
          >
            {submitting ? "Adding…" : `Add ${selectedCount || ""} to shopping list`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};