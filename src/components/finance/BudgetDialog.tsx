import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from "@/hooks/useFinance";

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { category: string; planned_amount: number }) => void;
  existingCategories?: string[];
}

export const BudgetDialog = ({ open, onOpenChange, onSave, existingCategories = [] }: BudgetDialogProps) => {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const availableCategories = FINANCE_CATEGORIES.filter(
    (c) => !existingCategories.includes(c) && !["salary", "freelance", "investment"].includes(c)
  );

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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} className="w-full" disabled={submitting || !category || !amount}>
            {submitting ? "Saving..." : "Save Budget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
