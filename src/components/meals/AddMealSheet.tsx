import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, BookOpen, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { assignRecipeToSlot, persistAiRecipe } from "@/lib/meals/assignRecipeToSlot";
import type { SlotMealType } from "./AiSuggestSheet";

interface AddMealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  weekStartDate: string;
  dayOfWeek: number;
  mealType: SlotMealType;
  onPickAi: () => void;
  onPickBrowse: () => void;
}

export const AddMealSheet = ({
  open, onOpenChange, householdId, weekStartDate, dayOfWeek, mealType,
  onPickAi, onPickBrowse,
}: AddMealSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualMode, setManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setManualMode(false); setManualTitle(""); };

  const handleManualSave = async () => {
    const title = manualTitle.trim();
    if (!title || !user || !householdId) return;
    setSaving(true);
    try {
      const recipe = await persistAiRecipe({
        householdId, userId: user.id,
        recipe: { title, difficulty: "easy" },
      });
      await assignRecipeToSlot({
        householdId, userId: user.id,
        weekStartDate, dayOfWeek, mealType, recipeId: recipe.id,
      });
      queryClient.invalidateQueries({ queryKey: ["meal-plans", householdId] });
      queryClient.invalidateQueries({ queryKey: ["recipes", householdId] });
      toast({ title: "Added to your plan", description: title });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't add", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base capitalize">Add {mealType}</SheetTitle>
        </SheetHeader>

        {!manualMode ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => { onOpenChange(false); onPickAi(); }}
              className="w-full flex items-center gap-3 rounded-xl border p-4 text-left hover:bg-accent/50 transition-colors"
            >
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">AI Suggest</p>
                <p className="text-xs text-muted-foreground">3 ideas based on your pantry</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { onOpenChange(false); onPickBrowse(); }}
              className="w-full flex items-center gap-3 rounded-xl border p-4 text-left hover:bg-accent/50 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Browse Recipes</p>
                <p className="text-xs text-muted-foreground">Pick from your collection</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="w-full flex items-center gap-3 rounded-xl border p-4 text-left hover:bg-accent/50 transition-colors"
            >
              <Pencil className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Enter manually</p>
                <p className="text-xs text-muted-foreground">Just a name for now</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Input
              autoFocus
              placeholder={`What's for ${mealType}?`}
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSave(); }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setManualMode(false)}>Back</Button>
              <Button size="sm" disabled={!manualTitle.trim() || saving} onClick={handleManualSave}>
                {saving ? "Saving..." : "Add"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};