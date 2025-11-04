import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Recipe } from "@/types/database";
import { cn } from "@/lib/utils";

interface RecipeRatingDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRate: (recipeId: string, rating: number) => void;
  onHide: (recipeId: string) => void;
  onRemoveFromWeek?: (recipeId: string) => void;
}

export const RecipeRatingDialog = ({
  recipe,
  open,
  onOpenChange,
  onRate,
  onHide,
  onRemoveFromWeek,
}: RecipeRatingDialogProps) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [showLowRatingOptions, setShowLowRatingOptions] = useState(false);

  const handleStarClick = (rating: number) => {
    setSelectedRating(rating);
    if (rating < 3) {
      setShowLowRatingOptions(true);
    } else {
      // Good rating, submit immediately
      if (recipe) {
        onRate(recipe.id, rating);
        onOpenChange(false);
        resetState();
      }
    }
  };

  const handleRemoveFromWeek = () => {
    if (recipe && selectedRating) {
      onRate(recipe.id, selectedRating);
      if (onRemoveFromWeek) {
        onRemoveFromWeek(recipe.id);
      }
      onOpenChange(false);
      resetState();
    }
  };

  const handleNeverShowAgain = () => {
    if (recipe && selectedRating) {
      onRate(recipe.id, selectedRating);
      onHide(recipe.id);
      onOpenChange(false);
      resetState();
    }
  };

  const handleKeepIt = () => {
    if (recipe && selectedRating) {
      onRate(recipe.id, selectedRating);
      onOpenChange(false);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedRating(null);
    setShowLowRatingOptions(false);
    setHoveredStar(null);
  };

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate Recipe</DialogTitle>
          <DialogDescription>
            How did you like "{recipe.title}"?
          </DialogDescription>
        </DialogHeader>

        {!showLowRatingOptions ? (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-colors",
                      (hoveredStar !== null ? star <= hoveredStar : star <= (selectedRating || 0))
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Click to rate</p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <p className="text-center text-muted-foreground">
              This recipe didn't work for you?
            </p>
            <div className="space-y-2">
              {onRemoveFromWeek && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRemoveFromWeek}
                >
                  Remove from this week's plan
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full text-destructive"
                onClick={handleNeverShowAgain}
              >
                Never show this recipe again
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleKeepIt}
              >
                Keep it (just save rating)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
