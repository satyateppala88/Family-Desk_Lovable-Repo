import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PantryCategory } from "@/hooks/usePantryCategories";
import { PantryItem } from "@/hooks/usePantryItems";

interface PantryCategoryGridProps {
  categories: PantryCategory[];
  items: PantryItem[];
  onSelectCategory: (categoryName: string) => void;
}

export const PantryCategoryGrid = ({
  categories,
  items,
  onSelectCategory,
}: PantryCategoryGridProps) => {
  // Calculate stats for each category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; lowStock: number; expiring: number; expired: number }> = {};
    
    items.forEach((item) => {
      const category = item.category || "Other";
      if (!stats[category]) {
        stats[category] = { count: 0, lowStock: 0, expiring: 0, expired: 0 };
      }
      
      stats[category].count++;
      
      // Check low stock
      const qty = item.quantity || 0;
      const minQty = item.minimum_quantity || 0;
      if (minQty > 0 && qty <= minQty) {
        stats[category].lowStock++;
      }
      
      // Check expiry
      if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          stats[category].expired++;
        } else if (diffDays <= 7) {
          stats[category].expiring++;
        }
      }
    });
    
    return stats;
  }, [items]);

  // Sort categories by sort_order
  const sortedCategories = useMemo(() => {
    const known = new Set(categories.map((c) => c.name));
    const extras: PantryCategory[] = Object.keys(categoryStats)
      .filter((name) => !known.has(name))
      .map((name, idx) => ({
        id: `virtual-${name}`,
        household_id: "",
        name,
        icon: "📦",
        sort_order: 9999 + idx,
        created_at: "",
      }));
    return [...categories, ...extras].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
  }, [categories, categoryStats]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {sortedCategories.map((category) => {
        const stats = categoryStats[category.name] || { count: 0, lowStock: 0, expiring: 0, expired: 0 };
        
        return (
          <Card
            key={category.id}
            className="px-4 py-5 cursor-pointer hover:bg-accent/40 transition-colors"
            onClick={() => onSelectCategory(category.name)}
          >
            <div className="text-center space-y-2">
              {category.icon && (
                <div className="text-[32px] leading-none mb-2">{category.icon}</div>
              )}
              <div>
                <h3 className="font-medium text-[13px] leading-tight">{category.name}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {stats.count} item{stats.count !== 1 ? 's' : ''}
                </p>
              </div>
              
              {(stats.expired > 0 || stats.expiring > 0 || stats.lowStock > 0) && (
                <div className="flex flex-wrap gap-1 justify-center">
                  {stats.expired > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.expired} expired
                    </Badge>
                  )}
                  {stats.expiring > 0 && (
                    <Badge className="text-xs bg-orange-500 hover:bg-orange-600">
                      {stats.expiring} expiring
                    </Badge>
                  )}
                  {stats.lowStock > 0 && (
                    <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                      {stats.lowStock} low
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
