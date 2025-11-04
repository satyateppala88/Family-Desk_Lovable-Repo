import { Recipe } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, ChefHat } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecipeDetailDialog = ({
  recipe,
  open,
  onOpenChange,
}: RecipeDetailDialogProps) => {
  if (!recipe) return null;

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
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
