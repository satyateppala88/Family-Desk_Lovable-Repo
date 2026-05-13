import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from "@/hooks/useFinance";
import { CategorySelect } from "@/components/finance/CategorySelect";
import { useCustomCategories } from "@/hooks/useCustomCategories";

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { category: string; planned_amount: number }) => void;
  existingCategories?: string[];
}

export const BudgetDialog = ({ open, onOpenChange, onSave, existingCategories = [] }: BudgetDialogProps) => {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const { categories: customCats } = useCustomCategories("transaction");

  // Build the visible built-in list (income + already-budgeted excluded)
  const excludedBuiltIn = [
    "salary",
    "freelance",
    "investment_returns",
    ...FINANCE_CATEGORIES.filter((c) => existingCategories.includes(c)),
  ];

  const [submitting, setSubmitting] = useState(false);

  const handleSave = () => {
    if (submitting) return;
    if (!category || !amount || Number(amount) <= 0) return;
    setSubmitting(true);
    onSave({ category, planned_amount: Number(amount) });
    onOpenChange(false);
    setCategory("");
    setAmount("");
    setTimeout(() => setSubmitting(false), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect
              value={category}
              onValueChange={setCategory}
              builtIn={FINANCE_CATEGORIES}
              builtInLabels={CATEGORY_LABELS}
              scope="transaction"
              excludeBuiltIn={excludedBuiltIn}
              placeholder="Select category"
            />
            {customCats.some((c) => existingCategories.includes(c.key)) && (
              <p className="text-[10px] text-muted-foreground">
                Custom categories already budgeted are still listed — pick a different one.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Monthly Budget (₹)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="w-full" disabled={submitting || !category || !amount}>
            {submitting ? "Saving..." : "Save Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
