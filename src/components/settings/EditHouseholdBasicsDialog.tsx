import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Pencil } from "lucide-react";
import { HouseholdPreferences } from "@/types/database";

interface EditHouseholdBasicsDialogProps {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
}

export const EditHouseholdBasicsDialog = ({
  preferences,
  onSave,
  isUpdating,
}: EditHouseholdBasicsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    family_size_adults: preferences.family_size_adults ?? 2,
    family_size_children: preferences.family_size_children ?? 0,
    household_type: preferences.household_type ?? "nuclear" as const,
  });

  useEffect(() => {
    if (!open) return;
    setFormData({
      family_size_adults: preferences.family_size_adults ?? 2,
      family_size_children: preferences.family_size_children ?? 0,
      household_type: preferences.household_type ?? "nuclear" as const,
    });
  }, [open, preferences]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Household Basics</DialogTitle>
          <DialogDescription>
            Update your family composition
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Number of Adults</Label>
            <Input
              type="number"
              min="1"
              value={formData.family_size_adults}
              onChange={(e) =>
                setFormData({ ...formData, family_size_adults: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Number of Children</Label>
            <Input
              type="number"
              min="0"
              value={formData.family_size_children}
              onChange={(e) =>
                setFormData({ ...formData, family_size_children: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Household Type</Label>
            <RadioGroup
              value={formData.household_type}
              onValueChange={(v) => setFormData({ ...formData, household_type: v as "nuclear" | "joint" | "single" })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nuclear" id="edit-nuclear" />
                <Label htmlFor="edit-nuclear">Nuclear Family</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="joint" id="edit-joint" />
                <Label htmlFor="edit-joint">Joint Family</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="edit-single" />
                <Label htmlFor="edit-single">Single</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
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
