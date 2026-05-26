import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceSavingsGoal } from "@/hooks/useFinance";

interface SavingsGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; target_amount: number; current_amount: number; target_date: string | null }) => void;
  goal?: FinanceSavingsGoal | null;
  autoFocusDate?: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const SavingsGoalDialog = ({ open, onOpenChange, onSave, goal, autoFocusDate }: SavingsGoalDialogProps) => {
  const isEdit = !!goal;
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [targetMonth, setTargetMonth] = useState<string>(""); // "0".."11"
  const [targetYear, setTargetYear] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const monthTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Prefill on open / when goal changes
  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name || "");
      setTarget(String(goal.target_amount ?? ""));
      setCurrent(String(goal.current_amount ?? 0));
      if (goal.target_date) {
        const d = new Date(goal.target_date);
        setTargetMonth(String(d.getMonth()));
        setTargetYear(String(d.getFullYear()));
      } else {
        setTargetMonth("");
        setTargetYear("");
      }
    } else {
      setName("");
      setTarget("");
      setCurrent("0");
      setTargetMonth("");
      setTargetYear("");
    }
  }, [open, goal]);

  useEffect(() => {
    if (open && autoFocusDate) {
      // Defer to allow BottomSheet to render
      const t = setTimeout(() => monthTriggerRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open, autoFocusDate]);

  const handleSave = () => {
    if (submitting) return;
    if (!name || !target || Number(target) <= 0) return;
    setSubmitting(true);
    const target_date = targetMonth !== "" && targetYear !== ""
      ? `${targetYear}-${String(Number(targetMonth) + 1).padStart(2, "0")}-01`
      : null;
    onSave({
      name,
      target_amount: Number(target),
      current_amount: Number(current) || 0,
      target_date,
    });
    onOpenChange(false);
    setTimeout(() => setSubmitting(false), 600);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear + i);

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Savings Goal" : "New Savings Goal"}
      footer={
        <Button onClick={handleSave} className="w-full" disabled={submitting || !name || !target}>
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Goal"}
        </Button>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Name</Label>
            <Input placeholder="e.g., Emergency Fund" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Target Amount (₹)</Label>
            <Input type="number" inputMode="numeric" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} min="0" />
          </div>
          <div className="space-y-2">
            <Label>Saved So Far (₹)</Label>
            <Input type="number" inputMode="numeric" placeholder="0" value={current} onChange={(e) => setCurrent(e.target.value)} min="0" />
          </div>
          <div className="space-y-2">
            <Label>Target date (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={targetMonth} onValueChange={setTargetMonth}>
                <SelectTrigger ref={monthTriggerRef}>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={targetYear} onValueChange={setTargetYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
      </div>
    </BottomSheet>
  );
};
