import { Recipe } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Trash2, Youtube, Flame, Plus, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onDelete: (id: string) => void;
  onClick: (recipe: Recipe) => void;
  onRate?: (recipe: Recipe) => void;
  onAssign?: (recipe: Recipe) => void;
  compact?: boolean;
}

// Cuisine-based color palette for visual thumbnails
const CUISINE_COLORS: Record<string, string> = {
  indian: "from-amber-400/20 to-orange-500/20",
  italian: "from-green-400/20 to-red-400/20",
  chinese: "from-red-400/20 to-yellow-400/20",
  japanese: "from-pink-300/20 to-red-300/20",
  mexican: "from-green-400/20 to-yellow-400/20",
  thai: "from-green-400/20 to-amber-400/20",
  mediterranean: "from-blue-300/20 to-amber-300/20",
  american: "from-blue-400/20 to-red-400/20",
  french: "from-blue-300/20 to-purple-300/20",
  default: "from-primary/10 to-accent/20",
};

const getCuisineGradient = (cuisine: string | null) => {
  if (!cuisine) return CUISINE_COLORS.default;
  const key = cuisine.toLowerCase().split(" ")[0];
  return CUISINE_COLORS[key] || CUISINE_COLORS.default;
};

const CUISINE_EMOJIS: Record<string, string> = {
  indian: "🍛", italian: "🍝", chinese: "🥡", japanese: "🍱", mexican: "🌮",
  thai: "🍜", mediterranean: "🫒", american: "🍔", french: "🥐", korean: "🍲",
  default: "🍽️",
};

const getCuisineEmoji = (cuisine: string | null) => {
  if (!cuisine) return CUISINE_EMOJIS.default;
  const key = cuisine.toLowerCase().split(" ")[0];
  return CUISINE_EMOJIS[key] || CUISINE_EMOJIS.default;
};

export const RecipeCard = ({ recipe, onToggleFavorite, onDelete, onClick, onRate, onAssign, compact }: RecipeCardProps) => {
  const isMobile = useIsMobile();
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const calories = recipe.nutritional_info?.calories ? Math.round(recipe.nutritional_info.calories) : null;
  const gradient = getCuisineGradient(recipe.cuisine_type);
  const emoji = getCuisineEmoji(recipe.cuisine_type);

  const difficultyVariant = recipe.difficulty === "easy" ? "secondary" : recipe.difficulty === "hard" ? "destructive" : "outline";

  const handleYouTubeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + " recipe")}`;
    const inIframe = window.self !== window.top;
    if (!isMobile) {
      if (inIframe) { try { window.top?.open(url, '_blank'); } catch { window.open(url, '_top'); } } else { window.open(url, '_blank'); }
    } else { window.open(url, '_top'); }
  };

  return (
    <Card className="cursor-pointer transition-all hover:shadow-md group overflow-hidden" onClick={() => onClick(recipe)}>
      {/* Visual thumbnail area */}
      <div className={cn("relative h-24 sm:h-28 bg-gradient-to-br flex items-center justify-center", gradient)}>
        <span className="text-4xl sm:text-5xl select-none" aria-hidden="true">{emoji}</span>

        {/* Favorite star */}
        <Button
          size="icon" variant="ghost"
          className="absolute top-1.5 right-1.5 h-7 w-7 bg-background/60 backdrop-blur-sm hover:bg-background/80"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id, !recipe.is_favorite); }}
        >
          <Star className={cn("w-3.5 h-3.5", recipe.is_favorite && "fill-warning text-warning")} />
        </Button>

        {/* Assign button */}
        {onAssign && (
          <Button
            size="icon" variant="default"
            className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full shadow-md"
            onClick={(e) => { e.stopPropagation(); onAssign(recipe); }}
            aria-label="Add to meal plan"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Difficulty badge */}
        {recipe.difficulty && (
          <Badge variant={difficultyVariant} className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 h-4 capitalize">
            {recipe.difficulty}
          </Badge>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Title + cuisine */}
        <div>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">{recipe.title}</h3>
          {recipe.cuisine_type && (
            <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4 font-normal">
              {recipe.cuisine_type}
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalTime}m</span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings}</span>
          )}
          {calories && (
            <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{calories} cal</span>
          )}
          {recipe.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-warning text-warning" />{recipe.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-border/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onRate && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2"
              onClick={(e) => { e.stopPropagation(); onRate(recipe); }} style={{ minHeight: "28px" }}>
              Rate
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2"
            onClick={handleYouTubeClick} style={{ minHeight: "28px" }}>
            <Youtube className="w-3.5 h-3.5" /> Video
          </Button>
          <div className="flex-1" />
          <Button size="icon" variant="ghost"
            onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
            className="h-7 w-7 text-muted-foreground hover:text-destructive" style={{ minHeight: "28px" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
