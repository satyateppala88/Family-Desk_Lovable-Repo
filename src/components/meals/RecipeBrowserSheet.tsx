import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, Flame, Star, Plus, UtensilsCrossed } from "lucide-react";
import { Recipe } from "@/types/database";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface RecipeBrowserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  slotLabel: string; // e.g. "Monday Breakfast"
  onAssign: (recipe: Recipe) => void;
}

const CUISINE_FILTERS = ["Indian", "Italian", "Chinese", "Thai", "Mexican", "Mediterranean"];
const DIFFICULTY_FILTERS = ["easy", "medium", "hard"];
const TIME_FILTERS = [
  { label: "< 30m", max: 30 },
  { label: "30–60m", max: 60 },
  { label: "> 60m", max: Infinity },
];

export const RecipeBrowserSheet = ({ open, onOpenChange, recipes, slotLabel, onAssign }: RecipeBrowserSheetProps) => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<{ label: string; max: number } | null>(null);

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (cuisineFilter && r.cuisine_type?.toLowerCase() !== cuisineFilter.toLowerCase()) return false;
      if (difficultyFilter && r.difficulty !== difficultyFilter) return false;
      if (timeFilter) {
        const total = (r.prep_time || 0) + (r.cook_time || 0);
        if (timeFilter.max === 30 && total >= 30) return false;
        if (timeFilter.max === 60 && (total < 30 || total >= 60)) return false;
        if (timeFilter.max === Infinity && total < 60) return false;
      }
      return true;
    });
  }, [recipes, search, cuisineFilter, difficultyFilter, timeFilter]);

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 space-y-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">Choose a recipe</h3>
          <p className="text-xs text-muted-foreground">for {slotLabel}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {CUISINE_FILTERS.map(c => (
            <Badge key={c} variant={cuisineFilter === c ? "default" : "outline"}
              className="text-[10px] cursor-pointer shrink-0 hover:bg-primary/10"
              onClick={() => setCuisineFilter(cuisineFilter === c ? null : c)}>
              {c}
            </Badge>
          ))}
          {DIFFICULTY_FILTERS.map(d => (
            <Badge key={d} variant={difficultyFilter === d ? "default" : "outline"}
              className="text-[10px] cursor-pointer shrink-0 capitalize hover:bg-primary/10"
              onClick={() => setDifficultyFilter(difficultyFilter === d ? null : d)}>
              {d}
            </Badge>
          ))}
          {TIME_FILTERS.map(t => (
            <Badge key={t.label} variant={timeFilter?.label === t.label ? "default" : "outline"}
              className="text-[10px] cursor-pointer shrink-0 hover:bg-primary/10"
              onClick={() => setTimeFilter(timeFilter?.label === t.label ? null : t)}>
              {t.label}
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <UtensilsCrossed className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No matching recipes</p>
            </div>
          )}
          {filtered.map(recipe => {
            const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
            const calories = recipe.nutritional_info?.calories ? Math.round(recipe.nutritional_info.calories) : null;
            return (
              <div key={recipe.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => { onAssign(recipe); onOpenChange(false); }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{recipe.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {recipe.cuisine_type && (
                      <span className="text-[10px] text-muted-foreground">{recipe.cuisine_type}</span>
                    )}
                    {totalTime > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />{totalTime}m
                      </span>
                    )}
                    {calories && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Flame className="w-2.5 h-2.5" />{calories}
                      </span>
                    )}
                    {recipe.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Star className="w-2.5 h-2.5 fill-warning text-warning" />{recipe.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[80vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Choose a recipe</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
};
