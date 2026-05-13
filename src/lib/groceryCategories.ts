export interface CategoryMeta {
  label: string;
  emoji: string;
  order: number;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Vegetables: { label: "Vegetables", emoji: "🥬", order: 1 },
  Fruits: { label: "Fruits", emoji: "🍎", order: 2 },
  "Grains & Dal": { label: "Grains & Dal", emoji: "🌾", order: 3 },
  Dairy: { label: "Dairy", emoji: "🥛", order: 4 },
  Spices: { label: "Spices", emoji: "🌶", order: 5 },
  "Meat & Seafood": { label: "Meat & Seafood", emoji: "🍗", order: 6 },
  Bakery: { label: "Bakery", emoji: "🍞", order: 7 },
  Beverages: { label: "Beverages", emoji: "🥤", order: 8 },
  Snacks: { label: "Snacks", emoji: "🍪", order: 9 },
  Frozen: { label: "Frozen", emoji: "🧊", order: 10 },
  Household: { label: "Household", emoji: "🧴", order: 11 },
  "Personal Care": { label: "Personal Care", emoji: "🧼", order: 12 },
  Other: { label: "Other", emoji: "📦", order: 99 },
};

const SYNONYMS: Record<string, keyof typeof CATEGORY_META> = {
  veg: "Vegetables",
  vegetable: "Vegetables",
  vegetables: "Vegetables",
  veggies: "Vegetables",
  produce: "Vegetables",
  fruit: "Fruits",
  fruits: "Fruits",
  grain: "Grains & Dal",
  grains: "Grains & Dal",
  "grains & dal": "Grains & Dal",
  "grains and dal": "Grains & Dal",
  dal: "Grains & Dal",
  lentil: "Grains & Dal",
  lentils: "Grains & Dal",
  rice: "Grains & Dal",
  flour: "Grains & Dal",
  staples: "Grains & Dal",
  dairy: "Dairy",
  milk: "Dairy",
  spice: "Spices",
  spices: "Spices",
  masala: "Spices",
  meat: "Meat & Seafood",
  seafood: "Meat & Seafood",
  fish: "Meat & Seafood",
  poultry: "Meat & Seafood",
  bakery: "Bakery",
  bread: "Bakery",
  beverage: "Beverages",
  beverages: "Beverages",
  drink: "Beverages",
  drinks: "Beverages",
  snack: "Snacks",
  snacks: "Snacks",
  frozen: "Frozen",
  household: "Household",
  cleaning: "Household",
  "personal care": "Personal Care",
  toiletries: "Personal Care",
  other: "Other",
};

export function normalizeCategory(raw: string | null | undefined): keyof typeof CATEGORY_META {
  if (!raw) return "Other";
  const trimmed = raw.trim();
  if (CATEGORY_META[trimmed]) return trimmed;
  const key = trimmed.toLowerCase();
  if (SYNONYMS[key]) return SYNONYMS[key];
  // Try partial match
  for (const [syn, target] of Object.entries(SYNONYMS)) {
    if (key.includes(syn)) return target;
  }
  return "Other";
}

export function groupAndSort<T extends { category: string | null }>(
  items: T[]
): Array<{ key: keyof typeof CATEGORY_META; label: string; emoji: string; items: T[] }> {
  const groups = new Map<keyof typeof CATEGORY_META, T[]>();
  for (const item of items) {
    const key = normalizeCategory(item.category);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries())
    .map(([key, list]) => ({
      key,
      label: CATEGORY_META[key].label,
      emoji: CATEGORY_META[key].emoji,
      items: list,
    }))
    .sort((a, b) => CATEGORY_META[a.key].order - CATEGORY_META[b.key].order);
}