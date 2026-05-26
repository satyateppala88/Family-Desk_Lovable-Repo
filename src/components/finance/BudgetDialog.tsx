import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from "@/hooks/finance";
import { CategorySelect, resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/formatINR";
import { Trash2, AlertTriangle } from "lucide-react";

export interface BudgetSavePayload {
  category: string;
  planned_amount: number;
  is_recurring: boolean;
  budget_type: "monthly" | "annual";
  annual_amount?: number | null;
  edit_scope?: "this_month" | "all_future";
}

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BudgetSavePayload) => void;
  existingCategories?: string[];
  mode?: "create" | "edit";
  initialCategory?: string;
  initialAmount?: number;
  initialBudgetType?: "monthly" | "annual";
  initialAnnualAmount?: number | null;
  /** Label of currently-viewed period, e.g. "May 2026" */
  monthLabel?: string;
  /** When editing, indicates the row came from rollforward (needs scope picker). */
  editSource?: "exact" | "recurring" | "annual";
  /** Called when the user confirms deleting this budget (edit mode only). */
  onDelete?: () => void;
}

export const BudgetDialog = ({
  open,
  onOpenChange,
  onSave,
  existingCategories = [],
  mode = "create",
  initialCategory,
  initialAmount,
  initialBudgetType = "monthly",
  initialAnnualAmount = null,
  monthLabel = "this month",
  editSource = "exact",
  onDelete,
}: BudgetDialogProps) => {
  const isEdit = mode === "edit";
  const [category, setCategory] = useState(initialCategory || "");
  const [budgetType, setBudgetType] = useState<"monthly" | "annual">(initialBudgetType);
  const [amount, setAmount] = useState(
    budgetType === "annual" && initialAnnualAmount != null
      ? String(initialAnnualAmount)
      : initialAmount != null
        ? String(initialAmount)
        : ""
  );
  // Monthly create: rollforward choice. Default Yes (recurring).
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  // Edit-recurring: which scope to apply the change to.
  const [editScope, setEditScope] = useState<"this_month" | "all_future">("all_future");
  const { categories: customCats } = useCustomCategories("transaction");

  useEffect(() => {
    if (open) {
      setCategory(initialCategory || "");
      setBudgetType(initialBudgetType);
      setAmount(
        initialBudgetType === "annual" && initialAnnualAmount != null
          ? String(initialAnnualAmount)
          : initialAmount != null
            ? String(initialAmount)
            : ""
      );
      setIsRecurring(true);
      setEditScope("all_future");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCategory, initialAmount, initialBudgetType, initialAnnualAmount]);

  // Build the visible built-in list (income + already-budgeted excluded)
  const excludedBuiltIn = [
    "salary",
    "freelance",
    "investment_returns",
    ...FINANCE_CATEGORIES.filter((c) => existingCategories.includes(c)),
  ];

  const [submitting, setSubmitting] = useState(false);

  const monthlyEquivalent = budgetType === "annual" && Number(amount) > 0
    ? Math.floor(Number(amount) / 12)
    : 0;

  const showScopePicker = isEdit && editSource === "recurring";

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    if (!open) setConfirmingDelete(false);
  }, [open]);
  const removesFromFuture = editSource === "recurring" || editSource === "annual";

  const handleSave = () => {
    if (submitting) return;
    if (!category || !amount || Number(amount) <= 0) return;
    setSubmitting(true);
    if (budgetType === "annual") {
      const annual = Number(amount);
      onSave({
        category,
        planned_amount: Math.floor(annual / 12),
        is_recurring: true,
        budget_type: "annual",
        annual_amount: annual,
      });
    } else {
      onSave({
        category,
        planned_amount: Number(amount),
        is_recurring: isEdit ? editSource === "recurring" && editScope === "all_future" : isRecurring,
        budget_type: "monthly",
        edit_scope: showScopePicker ? editScope : undefined,
      });
    }
    onOpenChange(false);
    if (!isEdit) {
      setCategory("");
      setAmount("");
    }
    setTimeout(() => setSubmitting(false), 600);
  };

  const submitLabel = (() => {
    if (submitting) return isEdit ? "Updating..." : "Saving...";
    if (isEdit) return "Update Budget";
    if (budgetType === "annual") return "Save Annual Budget";
    return isRecurring
      ? "Save & Apply to Future Months"
      : `Save for ${monthLabel} Only`;
  })();

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Budget" : "Set Budget"}
      footer={
        <Button onClick={handleSave} className="w-full" disabled={submitting || !category || !amount}>
          {submitLabel}
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

        {/* Monthly / Annual toggle — create only; edit locks to original type. */}
        {!isEdit && (
          <div className="space-y-2">
            <Label>Budget type</Label>
            <div className="inline-flex rounded-full border p-0.5 bg-muted/40">
              {(["monthly", "annual"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBudgetType(t)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full transition",
                    budgetType === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "monthly" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>
            {budgetType === "annual" ? "Annual Budget Amount (₹)" : "Monthly Budget (₹)"}
          </Label>
          <Input
            type="number" inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
          />
          {budgetType === "annual" && Number(amount) > 0 && (
            <p className="text-[11px] text-muted-foreground">
              = {formatINR(monthlyEquivalent)} per month
            </p>
          )}
        </div>

        {/* Rollforward question — monthly create only */}
        {!isEdit && budgetType === "monthly" && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Apply this budget to future months?</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="rollforward"
                checked={isRecurring}
                onChange={() => setIsRecurring(true)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">Yes</span> — repeat every month from {monthLabel}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="rollforward"
                checked={!isRecurring}
                onChange={() => setIsRecurring(false)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">No</span> — only apply to {monthLabel}
              </span>
            </label>
          </div>
        )}

        {/* Edit scope — only when editing a recurring row */}
        {showScopePicker && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Update budget for:</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="editscope"
                checked={editScope === "this_month"}
                onChange={() => setEditScope("this_month")}
                className="mt-1"
              />
              <span>This month only ({monthLabel})</span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="editscope"
                checked={editScope === "all_future"}
                onChange={() => setEditScope("all_future")}
                className="mt-1"
              />
              <span>This and all future months</span>
            </label>
          </div>
        )}

        {/* Delete budget — edit mode only */}
        {isEdit && onDelete && (
          <div className="pt-2">
            {!confirmingDelete ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(true)}
                className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                Delete this budget
              </Button>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Are you sure? This cannot be undone.
                </p>
                {removesFromFuture && (
                  <p className="text-xs flex items-start gap-1.5 text-destructive/90">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>This will remove this budget from all future months too.</span>
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      onDelete();
                      setConfirmingDelete(false);
                      onOpenChange(false);
                    }}
                  >
                    Yes, delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
