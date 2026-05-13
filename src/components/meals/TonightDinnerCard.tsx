import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, UtensilsCrossed, ShoppingCart } from "lucide-react";
import { navigateToShoppingListWithIngredients } from "@/lib/meals/shoppingListBridge";
import type { Recipe } from "@/types/database";

interface TonightDinnerCardProps {
  recipe: Recipe | null;
  onSuggest: () => void;
  onChange: () => void;
}

export const TonightDinnerCard = ({ recipe, onSuggest, onChange }: TonightDinnerCardProps) => {
  const navigate = useNavigate();

  if (!recipe) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/15 p-2.5 shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold leading-tight">What's for dinner tonight?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI will suggest something based on your pantry and preferences.
            </p>
            <Button onClick={onSuggest} className="mt-4">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Suggest dinner
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex gap-3 p-4 sm:p-5">
        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tonight's dinner</p>
          <h2 className="text-base sm:text-lg font-semibold leading-tight mt-0.5 line-clamp-2">{recipe.title}</h2>
          {recipe.cuisine_type && (
            <p className="text-xs text-muted-foreground mt-0.5">{recipe.cuisine_type}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 px-4 sm:px-5 pb-4 sm:pb-5">
        <Button variant="outline" size="sm" onClick={onChange} className="flex-1">
          Change
        </Button>
        <Button
          size="sm"
          onClick={() => navigateToShoppingListWithIngredients(
            navigate,
            `${recipe.title} ingredients`,
            (recipe.ingredients as any[]) || [],
          )}
          className="flex-1"
        >
          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
          Add ingredients to shopping list
        </Button>
      </div>
    </div>
  );
};