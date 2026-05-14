import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import {
  FinanceSubscription,
  SubscriptionInput,
  SUBSCRIPTION_CATEGORIES,
  SUBSCRIPTION_CATEGORY_LABELS,
  FREQUENCY_LABELS,
} from "@/hooks/useSubscriptions";
import { CategorySelect } from "@/components/finance/CategorySelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SubscriptionInput) => void;
  initialData?: FinanceSubscription | null;
}

export const SubscriptionDialog = ({ open, onOpenChange, onSave, initialData }: Props) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [category, setCategory] = useState<string>("other");
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAmount(String(initialData.amount));
      setFrequency(initialData.frequency);
      setCategory(initialData.category);
      setNextDueDate(initialData.next_due_date ? new Date(initialData.next_due_date) : undefined);
      setStartDate(new Date(initialData.start_date));
      setEndDate(initialData.end_date ? new Date(initialData.end_date) : undefined);
      setIsActive(initialData.is_active);
      setNotes(initialData.notes || "");
      setTags(initialData.tags?.join(", ") || "");
    } else {
      setName("");
      setAmount("");
      setFrequency("monthly");
      setCategory("other");
      setNextDueDate(undefined);
      setStartDate(new Date());
      setEndDate(undefined);
      setIsActive(true);
      setNotes("");
      setTags("");
    }
  }, [initialData, open]);

  const [submitting, setSubmitting] = useState(false);

  const handleSave = () => {
    if (submitting) return;
    if (!name.trim() || !amount) return;
    setSubmitting(true);
    onSave({
      name: name.trim(),
      amount: Number(amount),
      currency: "INR",
      frequency: frequency as SubscriptionInput["frequency"],
      category,
      next_due_date: nextDueDate ? format(nextDueDate, "yyyy-MM-dd") : null,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      is_active: isActive,
      notes: notes.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onOpenChange(false);
    setTimeout(() => setSubmitting(false), 600);
  };

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={initialData ? "Edit Subscription" : "Add Subscription"}
      footer={
        <Button onClick={handleSave} className="w-full" disabled={submitting || !name.trim() || !amount}>
          {submitting ? "Saving..." : initialData ? "Save Changes" : "Add Subscription"}
        </Button>
      }
    >
      <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="e.g. Netflix, LIC Premium, AC AMC" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input type="number" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <CategorySelect
              value={category}
              onValueChange={setCategory}
              builtIn={SUBSCRIPTION_CATEGORIES}
              builtInLabels={SUBSCRIPTION_CATEGORY_LABELS}
              scope="subscription"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Next Due Date</Label>
              <DatePicker value={nextDueDate} onChange={setNextDueDate} placeholder="Pick date" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="No end" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input placeholder="e.g. essential, family, work (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

      </div>
    </BottomSheet>
  );
};
