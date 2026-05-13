import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";

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
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="New Savings Goal"
      footer={
        <Button onClick={handleSave} className="w-full" disabled={submitting || !name || !target}>
          {submitting ? "Creating..." : "Create Goal"}
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
            <Label>Target Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !targetDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(parse(targetDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate ? parse(targetDate, "yyyy-MM-dd", new Date()) : undefined}
                  onSelect={(d) => setTargetDate(d ? format(d, "yyyy-MM-dd") : "")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
      </div>
    </BottomSheet>
  );
};
