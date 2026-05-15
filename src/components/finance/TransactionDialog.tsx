import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, CreditCard, PiggyBank } from "lucide-react";
import { format, parse } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import {
  FINANCE_CATEGORIES,
  CATEGORY_LABELS,
  SAVINGS_CATEGORIES,
  SAVINGS_CATEGORY_LABELS,
  FinanceTransaction,
  useFinanceSavingsGoals,
} from "@/hooks/useFinance";
import { CategorySelect } from "@/components/finance/CategorySelect";
import { recommendBestCard, CREDIT_CARD_CATALOG } from "@/data/creditCardCatalog";
import { formatINR } from "@/lib/formatINR";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

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
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { data: members } = useHouseholdMembers(householdId);
  const { data: savingsGoals } = useFinanceSavingsGoals(householdId);
  const activeGoals = (savingsGoals || []).filter((g) => g.status === "active");
  const [paidBy, setPaidBy] = useState<string>(initialData?.paid_by || user?.id || "");
  const [savingsGoalId, setSavingsGoalId] = useState<string>(initialData?.savings_goal_id || "");

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
      setPaidBy(user?.id || "");
      setSavingsGoalId("");
    }
  }, [open, initialData, user?.id]);

  // Safety net for BUG-FIX-03: if the dialog opened before `members`
  // resolved, the Select's value won't match any item until `paidBy` is
  // synced to the current user. Re-run once members lands and we still
  // don't have a selection.
  useEffect(() => {
    if (!open) return;
    if (paidBy) return;
    if (!user?.id) return;
    if (!members || members.length === 0) return;
    setPaidBy(user.id);
  }, [open, paidBy, user?.id, members]);

  const handleTypeChange = (next: string) => {
    setUserTouchedType(true);
    setType(next);
    if (next === "savings") {
      // Default to first savings sub-category
      setCategory((prev) => (SAVINGS_CATEGORIES as readonly string[]).includes(prev) ? prev : "sip");
    } else {
      // Leaving savings: reset to a sensible default and clear goal link
      setSavingsGoalId("");
      setCategory((prev) => ((SAVINGS_CATEGORIES as readonly string[]).includes(prev) ? "other" : prev));
    }
  };

  const handleCategoryChange = (next: string) => {
    setCategory(next);
    if (!userTouchedType && !initialData) {
      if (INCOME_CATEGORIES.has(next)) setType("income");
      else if (type === "income" && !INCOME_CATEGORIES.has(next)) setType("expense");
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSave = () => {
    if (submitting) return;
    if (!amount || Number(amount) <= 0) return;
    if (!paidBy) return;
    setSubmitting(true);
    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      type: type as "income" | "expense" | "savings",
      amount: Number(amount),
      category,
      description: description || null,
      transaction_date: date,
      notes: notes || null,
      paid_by: paidBy,
      savings_goal_id: type === "savings" ? (savingsGoalId || null) : null,
    });
    onOpenChange(false);
    // Re-enable shortly after the dialog has closed in case it's reopened.
    setTimeout(() => setSubmitting(false), 600);
  };

  // Inline card recommendation
  const showRecommendation = type === "expense" && category && category !== "other" && Number(amount) > 0 && userCardIds.length > 0;
  const bestCards = showRecommendation
    ? recommendBestCard(userCardIds, category, Number(amount)).slice(0, 1)
    : [];

  const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "M";
  const isSavings = type === "savings";

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={initialData ? "Edit Transaction" : "Add Transaction"}
      description={!initialData ? "Record an income or expense entry." : undefined}
      footer={
        <Button onClick={handleSave} disabled={submitting} className="w-full">
          {submitting ? "Saving…" : `${initialData ? "Update" : "Add"} Transaction`}
        </Button>
      }
    >
      <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-2">
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
              <Button
                type="button"
                variant={isSavings ? "default" : "outline"}
                onClick={() => handleTypeChange("savings")}
                className={isSavings ? "w-full bg-primary text-primary-foreground hover:bg-primary/90" : "w-full"}
              >
                <PiggyBank className="w-3.5 h-3.5 mr-1" /> Savings
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground px-0.5">
              {isSavings
                ? "Savings = money moved into an investment or deposit"
                : "Debit = money leaving · Credit = money coming in · Savings = invested"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{isSavings ? "Amount Saved (₹)" : "Amount (₹)"}</Label>
            <Input
              type="number" inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            {isSavings ? (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select savings type" />
                </SelectTrigger>
                <SelectContent>
                  {SAVINGS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{SAVINGS_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <CategorySelect
                value={category}
                onValueChange={handleCategoryChange}
                builtIn={FINANCE_CATEGORIES}
                builtInLabels={CATEGORY_LABELS}
                scope="transaction"
              />
            )}
          </div>

          {isSavings && (
            <div className="space-y-2">
              <Label>Link to Goal (optional)</Label>
              {activeGoals.length > 0 ? (
                <Select
                  value={savingsGoalId || "__none"}
                  onValueChange={(v) => setSavingsGoalId(v === "__none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No goal</SelectItem>
                    {activeGoals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} — {formatINR(Number(g.current_amount))} of {formatINR(Number(g.target_amount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No goals yet —{" "}
                  <Link to="/finance/savings" className="text-primary underline" onClick={() => onOpenChange(false)}>
                    create one in Savings
                  </Link>
                </p>
              )}
            </div>
          )}

          {(members?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label>Paid by</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {(members || []).map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      <span className="inline-flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                          <AvatarFallback className="text-[9px]">{initialsOf(m.displayName)}</AvatarFallback>
                        </Avatar>
                        <span>{m.displayName}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <DatePicker
              value={date ? parse(date, "yyyy-MM-dd", new Date()) : undefined}
              onChange={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
            />
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

      </div>
    </BottomSheet>
  );
};
