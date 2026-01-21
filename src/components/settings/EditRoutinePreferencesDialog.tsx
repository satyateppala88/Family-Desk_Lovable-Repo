import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import { HouseholdPreferences } from "@/types/database";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditRoutinePreferencesDialogProps {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
}

export const EditRoutinePreferencesDialog = ({
  preferences,
  onSave,
  isUpdating,
}: EditRoutinePreferencesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    household_concerns: preferences.household_concerns ?? [],
    work_schedule: preferences.work_schedule ?? "both_working",
    preferred_task_time: preferences.preferred_task_time ?? "evening",
    festival_importance: preferences.festival_importance ?? "somewhat",
  });

  const handleCheckboxChange = (value: string) => {
    const currentValues = formData.household_concerns;
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, household_concerns: newValues });
  };

  const handleSubmit = async () => {
    await onSave(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Household Routine</DialogTitle>
          <DialogDescription>
            Update your daily schedule and priorities
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Primary Household Concerns</Label>
              <div className="space-y-2 mt-2">
                {["Time management", "Budget optimization", "Health & nutrition", "Child care", "Elder care", "Pet care"].map((concern) => (
                  <div key={concern} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.household_concerns.includes(concern)}
                      onCheckedChange={() => handleCheckboxChange(concern)}
                    />
                    <Label>{concern}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Schedule</Label>
              <RadioGroup
                value={formData.work_schedule}
                onValueChange={(v) => setFormData({ ...formData, work_schedule: v as typeof formData.work_schedule })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both_working" id="edit-work1" />
                  <Label htmlFor="edit-work1">Both working</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one_working" id="edit-work2" />
                  <Label htmlFor="edit-work2">One working</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retired" id="edit-work3" />
                  <Label htmlFor="edit-work3">Retired</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="students" id="edit-work4" />
                  <Label htmlFor="edit-work4">Students</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred Task Time</Label>
              <RadioGroup
                value={formData.preferred_task_time}
                onValueChange={(v) => setFormData({ ...formData, preferred_task_time: v as typeof formData.preferred_task_time })}
              >
                {["morning", "afternoon", "evening", "flexible"].map((time) => (
                  <div key={time} className="flex items-center space-x-2">
                    <RadioGroupItem value={time} id={`edit-tasktime-${time}`} />
                    <Label htmlFor={`edit-tasktime-${time}`} className="capitalize">
                      {time}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Festival Celebrations Importance</Label>
              <RadioGroup
                value={formData.festival_importance}
                onValueChange={(v) => setFormData({ ...formData, festival_importance: v as typeof formData.festival_importance })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="very_important" id="edit-fest1" />
                  <Label htmlFor="edit-fest1">Very important</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="somewhat" id="edit-fest2" />
                  <Label htmlFor="edit-fest2">Somewhat important</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_important" id="edit-fest3" />
                  <Label htmlFor="edit-fest3">Not important</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
