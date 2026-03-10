import { Recipe } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Trash2, Youtube, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onDelete: (id: string) => void;
  onClick: (recipe: Recipe) => void;
  onRate?: (recipe: Recipe) => void;
}

export const RecipeCard = ({ recipe, onToggleFavorite, onDelete, onClick, onRate }: RecipeCardProps) => {
  const isMobile = useIsMobile();
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const calories = recipe.nutritional_info?.calories ? Math.round(recipe.nutritional_info.calories) : null;

  const getYouTubeSearchUrl = (recipeName: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(recipeName + " recipe")}`;
  };

  const handleYouTubeClick = (e: React.MouseEvent, recipeName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getYouTubeSearchUrl(recipeName);
    const inIframe = window.self !== window.top;
    if (!isMobile) {
      if (inIframe) {
        try { window.top?.open(url, '_blank'); } catch { window.open(url, '_top'); }
      } else {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_top');
    }
  };

  const difficultyColor = recipe.difficulty === "easy"
    ? "text-[hsl(var(--success))]"
    : recipe.difficulty === "hard"
    ? "text-destructive"
    : "text-warning";

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md group"
      onClick={() => onClick(recipe)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug line-clamp-2">{recipe.title}</h3>
            {recipe.cuisine_type && (
              <p className="text-xs text-muted-foreground mt-0.5">{recipe.cuisine_type}</p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe.id, !recipe.is_favorite);
            }}
            className="h-8 w-8 shrink-0"
            style={{ minHeight: "32px" }}
          >
            <Star className={cn("w-4 h-4", recipe.is_favorite && "fill-warning text-warning")} />
          </Button>
        </div>

        {recipe.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{recipe.description}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalTime}m
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {recipe.servings}
            </span>
          )}
          {calories && (
            <span className="flex items-center gap-1 text-[hsl(var(--module-meals))]">
              <Flame className="w-3 h-3" />
              {calories} cal
            </span>
          )}
          <span className={cn("capitalize font-medium", difficultyColor)}>
            {recipe.difficulty}
          </span>
          {recipe.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-warning text-warning" />
              {recipe.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Actions — visible on hover (desktop) or always (mobile) */}
        <div className="flex items-center gap-1 pt-1 border-t border-border/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onRate && (
            <Button
              size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2"
              onClick={(e) => { e.stopPropagation(); onRate(recipe); }}
              style={{ minHeight: "28px" }}
            >
              Rate
            </Button>
          )}
          <Button
            size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2"
            onClick={(e) => handleYouTubeClick(e, recipe.title)}
            style={{ minHeight: "28px" }}
          >
            <Youtube className="w-3.5 h-3.5" /> Video
          </Button>
          <div className="flex-1" />
          <Button
            size="icon" variant="ghost"
            onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            style={{ minHeight: "28px" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
