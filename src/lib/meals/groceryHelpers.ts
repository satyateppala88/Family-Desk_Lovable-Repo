import { supabase } from "@/lib/supabase";

export interface IngredientLite {
  name: string;
  quantity?: string | number | null;
  unit?: string | null;
}

export interface PantryLite {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Naive singular/plural and substring match. */
function pantryHasIngredient(ingName: string, pantry: PantryLite[]): PantryLite | null {
  const target = norm(ingName);
  if (!target) return null;
  const targetSingular = target.endsWith("s") ? target.slice(0, -1) : target;
  for (const p of pantry) {
    const pn = norm(p.name);
    if (!pn) continue;
    if (pn === target || pn === targetSingular) return p;
    if (pn.includes(target) || target.includes(pn)) return p;
    if (pn.includes(targetSingular) || targetSingular.includes(pn)) return p;
  }
  return null;
}

export function splitIngredientsByPantry(
  ingredients: IngredientLite[],
  pantry: PantryLite[],
): { missing: IngredientLite[]; inStock: IngredientLite[] } {
  const missing: IngredientLite[] = [];
  const inStock: IngredientLite[] = [];
  for (const ing of ingredients) {
    if (!ing?.name) continue;
    const match = pantryHasIngredient(ing.name, pantry);
    if (match && (match.quantity ?? 0) > 0) {
      inStock.push(ing);
    } else {
      missing.push(ing);
    }
  }
  return { missing, inStock };
}

export interface AddToListParams {
  householdId: string;
  userId: string;
  recipeTitle: string;
  items: IngredientLite[];
}

export interface AddToListResult {
  listId: string;
  listName: string;
  added: number;
  appended: boolean;
}

/**
 * Append items to the most recent active shopping list, or create a new one
 * named "{recipeTitle} — {dd MMM}" if none exists.
 */
export async function addIngredientsToShoppingList({
  householdId,
  userId,
  recipeTitle,
  items,
}: AddToListParams): Promise<AddToListResult> {
  // 1. Try to find an active list
  const { data: existing } = await supabase
    .from("shopping_lists")
    .select("id, name")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  let listId: string;
  let listName: string;
  let appended = false;

  if (existing && existing.length > 0) {
    listId = existing[0].id;
    listName = existing[0].name;
    appended = true;
  } else {
    const dateLabel = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    listName = `${recipeTitle} — ${dateLabel}`;
    const { data: created, error: createErr } = await supabase
      .from("shopping_lists")
      .insert([{
        household_id: householdId,
        name: listName,
        created_by: userId,
        status: "active",
      }])
      .select("id, name")
      .single();
    if (createErr || !created) throw createErr || new Error("Couldn't create shopping list");
    listId = created.id;
    listName = created.name;
  }

  // 2. Insert items
  const rows = items
    .filter((i) => i?.name)
    .map((i) => {
      const qtyNum = i.quantity != null ? parseFloat(String(i.quantity).replace(/[^0-9.]/g, "")) : NaN;
      return {
        list_id: listId,
        name: i.name,
        quantity: Number.isFinite(qtyNum) ? qtyNum : null,
        unit: i.unit || null,
        category: null,
        is_checked: false,
        pantry_item_id: null,
        recipe_source: recipeTitle,
      };
    });

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("shopping_list_items").insert(rows);
    if (insErr) throw insErr;
  }

  return { listId, listName, added: rows.length, appended };
}