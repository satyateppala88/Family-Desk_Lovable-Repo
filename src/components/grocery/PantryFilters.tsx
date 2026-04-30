import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import type { PantryCategory } from "@/hooks/usePantryCategories";

interface PantryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  categories: PantryCategory[];
}

export const PantryFilters = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  categories,
}: PantryFiltersProps) => {
  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedStatus !== "all";

  const clearFilters = () => {
    onSearchChange("");
    onCategoryChange("all");
    onStatusChange("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="staples">Staples Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="cursor-pointer" onClick={clearFilters}>
            Clear filters <X className="h-3 w-3 ml-1" />
          </Badge>
          {searchQuery && (
            <Badge variant="outline">
              Search: {searchQuery}
            </Badge>
          )}
          {selectedCategory !== "all" && (
            <Badge variant="outline">
              Category: {selectedCategory}
            </Badge>
          )}
          {selectedStatus !== "all" && (
            <Badge variant="outline">
              Status: {selectedStatus}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
