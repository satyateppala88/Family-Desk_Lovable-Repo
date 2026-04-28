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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import { HouseholdPreferences } from "@/types/database";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditCookingPreferencesDialogProps {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
}

export const EditCookingPreferencesDialog = ({
  preferences,
  onSave,
  isUpdating,
}: EditCookingPreferencesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    cooking_skill_level: preferences.cooking_skill_level ?? "intermediate",
    weekday_cooking_time: preferences.weekday_cooking_time ?? "30_to_60",
    preferred_meal_types: preferences.preferred_meal_types ?? [],
    pantry_size: preferences.pantry_size ?? "medium",
    shopping_frequency: preferences.shopping_frequency ?? "weekly",
  });

  useEffect(() => {
    if (!open) return;
    setFormData({
      cooking_skill_level: preferences.cooking_skill_level ?? "intermediate",
      weekday_cooking_time: preferences.weekday_cooking_time ?? "30_to_60",
      preferred_meal_types: preferences.preferred_meal_types ?? [],
      pantry_size: preferences.pantry_size ?? "medium",
      shopping_frequency: preferences.shopping_frequency ?? "weekly",
    });
  }, [open, preferences]);

  const handleCheckboxChange = (value: string) => {
    const currentValues = formData.preferred_meal_types;
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, preferred_meal_types: newValues });
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
          <DialogTitle>Edit Cooking & Meal Planning</DialogTitle>
          <DialogDescription>
            Update your cooking habits and preferences
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Cooking Skill Level</Label>
              <RadioGroup
                value={formData.cooking_skill_level}
                onValueChange={(v) => setFormData({ ...formData, cooking_skill_level: v as typeof formData.cooking_skill_level })}
              >
                {["beginner", "intermediate", "expert"].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={`edit-skill-${level}`} />
                    <Label htmlFor={`edit-skill-${level}`} className="capitalize">
                      {level}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Available Cooking Time (Weekdays)</Label>
              <RadioGroup
                value={formData.weekday_cooking_time}
                onValueChange={(v) => setFormData({ ...formData, weekday_cooking_time: v as typeof formData.weekday_cooking_time })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="less_than_30" id="edit-time1" />
                  <Label htmlFor="edit-time1">Less than 30 minutes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30_to_60" id="edit-time2" />
                  <Label htmlFor="edit-time2">30-60 minutes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="more_than_60" id="edit-time3" />
                  <Label htmlFor="edit-time3">More than 60 minutes</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred Meal Types</Label>
              <div className="space-y-2 mt-2">
                {["Quick weekday meals", "Traditional weekend meals", "Festival special recipes", "Healthy/Diet meals"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.preferred_meal_types.includes(type)}
                      onCheckedChange={() => handleCheckboxChange(type)}
                    />
                    <Label>{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pantry Size</Label>
              <RadioGroup
                value={formData.pantry_size}
                onValueChange={(v) => setFormData({ ...formData, pantry_size: v as typeof formData.pantry_size })}
              >
                {["small", "medium", "large"].map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={`edit-pantry-${size}`} />
                    <Label htmlFor={`edit-pantry-${size}`} className="capitalize">
                      {size}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Shopping Frequency</Label>
              <RadioGroup
                value={formData.shopping_frequency}
                onValueChange={(v) => setFormData({ ...formData, shopping_frequency: v as typeof formData.shopping_frequency })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="edit-freq1" />
                  <Label htmlFor="edit-freq1">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2_3_per_week" id="edit-freq2" />
                  <Label htmlFor="edit-freq2">2-3 times per week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="edit-freq3" />
                  <Label htmlFor="edit-freq3">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bi_weekly" id="edit-freq4" />
                  <Label htmlFor="edit-freq4">Bi-weekly</Label>
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
