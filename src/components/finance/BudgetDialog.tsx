import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from "@/hooks/useFinance";
import { CategorySelect, resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { useCustomCategories } from "@/hooks/useCustomCategories";

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { category: string; planned_amount: number }) => void;
  existingCategories?: string[];
  mode?: "create" | "edit";
  initialCategory?: string;
  initialAmount?: number;
}

export const BudgetDialog = ({
  open,
  onOpenChange,
  onSave,
  existingCategories = [],
  mode = "create",
  initialCategory,
  initialAmount,
}: BudgetDialogProps) => {
  const isEdit = mode === "edit";
  const [category, setCategory] = useState(initialCategory || "");
  const [amount, setAmount] = useState(
    initialAmount != null ? String(initialAmount) : ""
  );
  const { categories: customCats } = useCustomCategories("transaction");

  useEffect(() => {
    if (open) {
      setCategory(initialCategory || "");
      setAmount(initialAmount != null ? String(initialAmount) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCategory, initialAmount]);

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
    if (!isEdit) {
      setCategory("");
      setAmount("");
    }
    setTimeout(() => setSubmitting(false), 600);
  };

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Budget" : "Set Budget"}
      footer={
        <Button onClick={handleSave} className="w-full" disabled={submitting || !category || !amount}>
          {submitting
            ? isEdit
              ? "Updating..."
              : "Saving..."
            : isEdit
              ? "Update Budget"
              : "Add Budget"}
        </Button>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            {isEdit ? (
              <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm">
                {resolveCategoryLabel(category, CATEGORY_LABELS, customCats)}
              </div>
            ) : (
              <CategorySelect
                value={category}
                onValueChange={setCategory}
                builtIn={FINANCE_CATEGORIES}
                builtInLabels={CATEGORY_LABELS}
                scope="transaction"
                excludeBuiltIn={excludedBuiltIn}
                placeholder="Select category"
              />
            )}
            {!isEdit && customCats.some((c) => existingCategories.includes(c.key)) && (
              <p className="text-[10px] text-muted-foreground">
                Custom categories already budgeted are still listed — pick a different one.
              </p>
            )}
          </div>
        <div className="space-y-2">
          <Label>Monthly Budget (₹)</Label>
          <Input
            type="number" inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
          />
        </div>
      </div>
    </BottomSheet>
  );
};
