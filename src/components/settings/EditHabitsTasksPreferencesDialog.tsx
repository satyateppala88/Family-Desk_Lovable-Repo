import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";
import { HouseholdPreferences } from "@/types/database";

interface Props {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
  trigger?: React.ReactNode;
  scope: "habits" | "tasks";
}

/**
 * Habits & Tasks share a small set of routine fields. We expose the same
 * dialog but title it per scope so each module's card only shows its own
 * concern. Saving only writes the shared routine fields — never anything
 * outside this scope.
 */
const ROUTINE_FIELDS = ["preferred_task_time", "household_concerns"] as const;

export const EditHabitsTasksPreferencesDialog = ({ preferences, onSave, isUpdating, trigger, scope }: Props) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({
    preferred_task_time: preferences.preferred_task_time ?? "evening",
    household_concerns: preferences.household_concerns ?? [],
  });

  useEffect(() => {
    if (open) {
      setData({
        preferred_task_time: preferences.preferred_task_time ?? "evening",
        household_concerns: preferences.household_concerns ?? [],
      });
    }
  }, [open, preferences]);

  const toggle = (v: string) => {
    const next = data.household_concerns.includes(v)
      ? data.household_concerns.filter((x) => x !== v)
      : [...data.household_concerns, v];
    setData({ ...data, household_concerns: next });
  };

  const handleSubmit = async () => {
    const updates: Partial<HouseholdPreferences> = {};
    ROUTINE_FIELDS.forEach((f) => { (updates as Record<string, unknown>)[f] = data[f as keyof typeof data]; });
    await onSave(updates);
    setOpen(false);
  };

  const title = scope === "habits" ? "Habits preferences" : "Tasks preferences";
  const desc = scope === "habits"
    ? "Your routine and what matters most to you."
    : "When you're most likely to tackle tasks.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-2" />Edit</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            <div>
              <Label>Preferred time of day</Label>
              <RadioGroup className="mt-2" value={data.preferred_task_time} onValueChange={(v) => setData({ ...data, preferred_task_time: v as any })}>
                {["morning", "afternoon", "evening", "flexible"].map((t) => (
                  <div key={t} className="flex items-center space-x-2"><RadioGroupItem value={t} id={`r-t-${t}`} /><Label htmlFor={`r-t-${t}`} className="capitalize">{t}</Label></div>
                ))}
              </RadioGroup>
            </div>
            {scope === "habits" && (
              <div>
                <Label>What matters most to you?</Label>
                <div className="space-y-2 mt-2">
                  {["Time management", "Budget optimization", "Health & nutrition", "Child care", "Elder care", "Pet care"].map((c) => (
                    <div key={c} className="flex items-center space-x-2">
                      <Checkbox checked={data.household_concerns.includes(c)} onCheckedChange={() => toggle(c)} />
                      <Label>{c}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>{isUpdating ? "Saving..." : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
