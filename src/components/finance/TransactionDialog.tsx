import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, CreditCard } from "lucide-react";
import { FINANCE_CATEGORIES, CATEGORY_LABELS, FinanceTransaction } from "@/hooks/useFinance";
import { recommendBestCard, CREDIT_CARD_CATALOG } from "@/data/creditCardCatalog";
import { formatINR } from "@/lib/formatINR";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<FinanceTransaction>) => void;
  initialData?: FinanceTransaction | null;
  userCardIds?: string[];
}

export const TransactionDialog = ({ open, onOpenChange, onSave, initialData, userCardIds = [] }: TransactionDialogProps) => {
  const [type, setType] = useState<string>(initialData?.type || "expense");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [category, setCategory] = useState(initialData?.category || "other");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(initialData?.transaction_date || new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [userTouchedType, setUserTouchedType] = useState(false);

  const INCOME_CATEGORIES = new Set(["salary", "freelance", "investment"]);

  // Reset on open change
  useEffect(() => {
    if (open && !initialData) {
      setType("expense");
      setAmount("");
      setCategory("other");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setUserTouchedType(false);
    }
  }, [open, initialData]);

  const handleTypeChange = (next: string) => {
    setUserTouchedType(true);
    setType(next);
  };

  const handleCategoryChange = (next: string) => {
    setCategory(next);
    if (!userTouchedType && !initialData) {
      if (INCOME_CATEGORIES.has(next)) setType("income");
      else if (type === "income" && !INCOME_CATEGORIES.has(next)) setType("expense");
    }
  };

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
  };

  // Inline card recommendation
  const showRecommendation = type === "expense" && category && category !== "other" && Number(amount) > 0 && userCardIds.length > 0;
  const bestCards = showRecommendation
    ? recommendBestCard(userCardIds, category, Number(amount)).slice(0, 1)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          {!initialData && <DialogDescription>Record an income or expense entry.</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                onClick={() => handleTypeChange("expense")}
                className={type === "expense" ? "w-full bg-destructive text-destructive-foreground hover:bg-destructive/90" : "w-full"}
              >
                − Debit
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                onClick={() => handleTypeChange("income")}
                className={type === "income" ? "w-full bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success))]/90" : "w-full"}
              >
                + Credit
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground px-0.5">
              Debit = money leaving your account · Credit = money coming in
            </p>
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
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FINANCE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inline card recommendation */}
          {bestCards.length > 0 && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <div
                className="w-8 h-5.5 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ backgroundColor: bestCards[0].card.color }}
              >
                {bestCards[0].card.network.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Use {bestCards[0].card.bank} {bestCards[0].card.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bestCards[0].benefit.description} · saves ≈{formatINR(Math.round(bestCards[0].estimatedValue))}
                </p>
              </div>
            </div>
          )}

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
