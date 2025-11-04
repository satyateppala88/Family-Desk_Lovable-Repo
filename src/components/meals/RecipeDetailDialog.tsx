import { Recipe } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ChefHat, Star, Youtube } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRate?: (recipe: Recipe) => void;
}

export const RecipeDetailDialog = ({
  recipe,
  open,
  onOpenChange,
  onRate,
}: RecipeDetailDialogProps) => {
  if (!recipe) return null;

  const isMobile = useIsMobile();

  const getYouTubeSearchUrl = (recipeName: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(recipeName + " recipe")}`;
  };

  const handleYouTubeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const url = getYouTubeSearchUrl(recipe.title);
    const inIframe = window.self !== window.top;
    
    if (!isMobile) {
      if (inIframe) {
        try {
          window.top?.open(url, '_blank');
        } catch {
          window.open(url, '_top');
        }
      } else {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_top');
    }
  };

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl flex-1">{recipe.title}</DialogTitle>
            <div className="flex gap-2">
              {onRate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRate(recipe)}
                >
                  <Star className={`w-4 h-4 mr-2 ${recipe.rating ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  Rate
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleYouTubeClick}
              >
                <Youtube className="w-4 h-4 mr-2" />
                Watch
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}

            {recipe.rating && (
              <div className="flex items-center gap-2 p-3 bg-secondary/20 rounded-lg">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg">{recipe.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({recipe.rating_count} rating{recipe.rating_count !== 1 ? 's' : ''})
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {recipe.prep_time && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Prep: {recipe.prep_time} min</span>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Cook: {recipe.cook_time} min</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-sm">
                <Users className="w-4 h-4" />
                <span>{recipe.servings} servings</span>
              </div>
              <Badge variant="outline" className="capitalize">
                <ChefHat className="w-3 h-3 mr-1" />
                {recipe.difficulty}
              </Badge>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient: any, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm">
                      {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-3">Instructions</h3>
              <ol className="space-y-3">
                {recipe.instructions.map((instruction: any, index: number) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                      {instruction.step}
                    </span>
                    <span className="text-sm pt-0.5">{instruction.instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {recipe.tags && recipe.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
