import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Ingredient {
  name: string;
  quantity: string;
  unit?: string;
}

interface MarkAsCookedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeName: string;
  ingredients: Ingredient[];
  onConfirm: () => void;
}

export const MarkAsCookedDialog = ({
  open,
  onOpenChange,
  recipeName,
  ingredients,
  onConfirm,
}: MarkAsCookedDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Cooked</DialogTitle>
          <DialogDescription>
            Marking this meal as cooked will deduct the following ingredients from your pantry.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Auto-update works best when you follow your meal plan!</strong>
              <br />
              Only mark meals as cooked when you actually prepare them to keep your pantry accurate.
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="font-semibold mb-2">{recipeName}</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Ingredients to be deducted:</p>
              <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{ingredient.name}</span>
                    <Badge variant="secondary">
                      {ingredient.quantity} {ingredient.unit || ""}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Pantry will be updated automatically
                </p>
                <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                  Quantities will be deducted from matching pantry items. Items not in your pantry will be skipped.
                </p>
              </div>
            </div>
          </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? "Updating..." : "Confirm & Mark as Cooked"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
