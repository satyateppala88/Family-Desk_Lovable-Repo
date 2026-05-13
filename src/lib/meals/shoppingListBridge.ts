import type { NavigateFunction } from "react-router-dom";

export interface IngredientLite {
  name: string;
  quantity?: string | number;
  unit?: string;
}

/**
 * Encode a recipe's ingredients into URL params and navigate to the Grocery
 * page's Shopping tab. The Grocery page will pick these up, create a list,
 * and pre-populate the items.
 */
export function navigateToShoppingListWithIngredients(
  navigate: NavigateFunction,
  listName: string,
  ingredients: IngredientLite[],
) {
  const items = ingredients
    .filter((i) => i?.name)
    .map((i) => {
      const qty = i.quantity != null ? String(i.quantity) : "";
      const unit = i.unit || "";
      return [i.name, qty, unit].join("|");
    })
    .join(";;");

  const params = new URLSearchParams({
    tab: "shopping",
    newList: listName,
    items,
  });
  navigate(`/grocery?${params.toString()}`);
}

export function decodeIngredientsParam(raw: string | null): IngredientLite[] {
  if (!raw) return [];
  return raw.split(";;").filter(Boolean).map((entry) => {
    const [name, quantity, unit] = entry.split("|");
    return { name, quantity: quantity || undefined, unit: unit || undefined };
  });
}