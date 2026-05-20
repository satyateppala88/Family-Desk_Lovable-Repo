import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { RecurringEditScope } from "@/hooks/useManualCalendarEvents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: RecurringEditScope) => void;
}

const OPTIONS: { value: RecurringEditScope; label: string }[] = [
  { value: "this", label: "This event only" },
  { value: "future", label: "This and all future events" },
  { value: "all", label: "All events" },
];

export const RecurrenceEditScopeDialog = ({ open, onOpenChange, onSelect }: Props) => {
  const [scope, setScope] = useState<RecurringEditScope>("this");

  useEffect(() => {
    if (open) setScope("this");
  }, [open]);

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Edit recurring event"
      description="Choose which occurrences this change should apply to."
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => onSelect(scope)}>
            Edit
          </Button>
        </div>
      }
    >
      <RadioGroup
        value={scope}
        onValueChange={(v) => setScope(v as RecurringEditScope)}
        className="gap-3"
      >
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            htmlFor={`scope-${opt.value}`}
            className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
          >
            <RadioGroupItem value={opt.value} id={`scope-${opt.value}`} />
            <Label htmlFor={`scope-${opt.value}`} className="cursor-pointer flex-1">
              {opt.label}
            </Label>
          </label>
        ))}
      </RadioGroup>
    </BottomSheet>
  );
};