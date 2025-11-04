import { Recipe } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Trash2, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onDelete: (id: string) => void;
  onClick: (recipe: Recipe) => void;
  onRate?: (recipe: Recipe) => void;
}

export const RecipeCard = ({ recipe, onToggleFavorite, onDelete, onClick, onRate }: RecipeCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getYouTubeSearchUrl = (recipeName: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(recipeName + " recipe")}`;
  };

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={() => onClick(recipe)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{recipe.title}</CardTitle>
            {recipe.cuisine_type && (
              <p className="text-sm text-muted-foreground mt-1">{recipe.cuisine_type}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(recipe.id, !recipe.is_favorite);
              }}
              className="h-8 w-8"
            >
              <Star className={cn("w-4 h-4", recipe.is_favorite && "fill-yellow-500 text-yellow-500")} />
            </Button>
            {onRate && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRate(recipe);
                }}
                className="h-8 w-8"
              >
                <Star className={cn("w-4 h-4", recipe.rating && "fill-yellow-400 text-yellow-400")} />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              asChild
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-8"
            >
              <a
                href={getYouTubeSearchUrl(recipe.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Watch recipe on YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(recipe.id);
              }}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {totalTime > 0 && (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {totalTime} min
            </Badge>
          )}

          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {recipe.servings} servings
          </Badge>

          <Badge variant="outline" className={cn("text-xs", getDifficultyColor(recipe.difficulty))}>
            {recipe.difficulty}
          </Badge>

          {recipe.rating && (
            <Badge variant="outline" className="text-xs">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              {recipe.rating.toFixed(1)} ({recipe.rating_count})
            </Badge>
          )}

          {recipe.source === "ai_generated" && (
            <Badge variant="outline" className="text-xs bg-purple-500/10">
              AI Generated
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
