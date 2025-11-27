import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  onGenerateFromMealPlan: () => void;
}

export const CreateShoppingListDialog = ({
  open,
  onOpenChange,
  onSubmit,
  onGenerateFromMealPlan,
}: CreateShoppingListDialogProps) => {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name);
    setName("");
    onOpenChange(false);
  };

  const handleGenerate = () => {
    onGenerateFromMealPlan();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Shopping List</DialogTitle>
          <DialogDescription>
            Create a new shopping list manually or generate from your meal plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Groceries"
              />
            </div>
            <Button onClick={handleSubmit} disabled={!name.trim()} className="w-full">
              Create Empty List
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button onClick={handleGenerate} variant="outline" className="w-full">
            Generate from Current Meal Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
