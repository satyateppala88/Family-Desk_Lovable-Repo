import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavingsGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; target_amount: number; current_amount: number; target_date: string | null }) => void;
}

export const SavingsGoalDialog = ({ open, onOpenChange, onSave }: SavingsGoalDialogProps) => {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [targetDate, setTargetDate] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleSave = () => {
    if (submitting) return;
    if (!name || !target || Number(target) <= 0) return;
    setSubmitting(true);
    onSave({
      name,
      target_amount: Number(target),
      current_amount: Number(current) || 0,
      target_date: targetDate || null,
    });
    onOpenChange(false);
    setName("");
    setTarget("");
    setCurrent("0");
    setTargetDate("");
    setTimeout(() => setSubmitting(false), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Savings Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Name</Label>
            <Input placeholder="e.g., Emergency Fund" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Target Amount (₹)</Label>
            <Input type="number" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} min="0" />
          </div>
          <div className="space-y-2">
            <Label>Saved So Far (₹)</Label>
            <Input type="number" placeholder="0" value={current} onChange={(e) => setCurrent(e.target.value)} min="0" />
          </div>
          <div className="space-y-2">
            <Label>Target Date (optional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={submitting || !name || !target}>
            {submitting ? "Creating..." : "Create Goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
