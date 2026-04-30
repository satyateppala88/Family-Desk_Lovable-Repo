import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";
import { HouseholdPreferences } from "@/types/database";

interface Props {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
  trigger?: React.ReactNode;
}

const CAL_FIELDS = ["work_schedule", "festival_importance"] as const;

export const EditCalendarPreferencesDialog = ({ preferences, onSave, isUpdating, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({
    work_schedule: preferences.work_schedule ?? "both_working",
    festival_importance: preferences.festival_importance ?? "somewhat",
  });

  useEffect(() => {
    if (open) {
      setData({
        work_schedule: preferences.work_schedule ?? "both_working",
        festival_importance: preferences.festival_importance ?? "somewhat",
      });
    }
  }, [open, preferences]);

  const handleSubmit = async () => {
    const updates: Partial<HouseholdPreferences> = {};
    CAL_FIELDS.forEach((f) => { (updates as Record<string, unknown>)[f] = data[f as keyof typeof data]; });
    await onSave(updates);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-2" />Edit</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Calendar preferences</DialogTitle>
          <DialogDescription>Work schedule and festival importance.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            <div>
              <Label>Work schedule</Label>
              <RadioGroup className="mt-2" value={data.work_schedule} onValueChange={(v) => setData({ ...data, work_schedule: v as any })}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="both_working" id="c-w1" /><Label htmlFor="c-w1">Both/all adults working</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="one_working" id="c-w2" /><Label htmlFor="c-w2">One adult working</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="retired" id="c-w3" /><Label htmlFor="c-w3">Retired</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="students" id="c-w4" /><Label htmlFor="c-w4">Students</Label></div>
              </RadioGroup>
            </div>
            <div>
              <Label>Festival importance</Label>
              <RadioGroup className="mt-2" value={data.festival_importance} onValueChange={(v) => setData({ ...data, festival_importance: v as any })}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="very_important" id="c-f1" /><Label htmlFor="c-f1">Very important</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="somewhat" id="c-f2" /><Label htmlFor="c-f2">Somewhat</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="not_important" id="c-f3" /><Label htmlFor="c-f3">Not important</Label></div>
              </RadioGroup>
            </div>
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
