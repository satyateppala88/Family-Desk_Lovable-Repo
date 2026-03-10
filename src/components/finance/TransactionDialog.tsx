import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FINANCE_CATEGORIES, CATEGORY_LABELS, FinanceTransaction } from "@/hooks/useFinance";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<FinanceTransaction>) => void;
  initialData?: FinanceTransaction | null;
}

export const TransactionDialog = ({ open, onOpenChange, onSave, initialData }: TransactionDialogProps) => {
  const [type, setType] = useState<string>(initialData?.type || "expense");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [category, setCategory] = useState(initialData?.category || "other");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(initialData?.transaction_date || new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(initialData?.notes || "");

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) return;
    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      type: type as "income" | "expense",
      amount: Number(amount),
      category,
      description: description || null,
      transaction_date: date,
      notes: notes || null,
    });
    onOpenChange(false);
    // Reset
    setAmount("");
    setDescription("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className="w-full"
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className="w-full"
            >
              Income
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FINANCE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            {initialData ? "Update" : "Add"} Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
