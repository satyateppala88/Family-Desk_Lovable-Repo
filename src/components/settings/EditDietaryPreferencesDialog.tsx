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

interface EditDietaryPreferencesDialogProps {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
}

export const EditDietaryPreferencesDialog = ({
  preferences,
  onSave,
  isUpdating,
}: EditDietaryPreferencesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    diet_type: preferences.diet_type ?? "vegetarian",
    food_allergies: preferences.food_allergies ?? [],
    religious_restrictions: preferences.religious_restrictions ?? "none",
    spice_level: preferences.spice_level ?? "medium",
    regional_cuisines: preferences.regional_cuisines ?? [],
  });

  useEffect(() => {
    if (!open) return;
    setFormData({
      diet_type: preferences.diet_type ?? "vegetarian",
      food_allergies: preferences.food_allergies ?? [],
      religious_restrictions: preferences.religious_restrictions ?? "none",
      spice_level: preferences.spice_level ?? "medium",
      regional_cuisines: preferences.regional_cuisines ?? [],
    });
  }, [open, preferences]);

  const handleCheckboxChange = (field: "food_allergies" | "regional_cuisines", value: string) => {
    const currentValues = formData[field] as string[];
    
    if (field === "food_allergies" && value === "None") {
      setFormData({ ...formData, [field]: ["None"] });
      return;
    } else if (field === "food_allergies") {
      const filteredValues = currentValues.filter(v => v !== "None");
      const newValues = filteredValues.includes(value)
        ? filteredValues.filter((v) => v !== value)
        : [...filteredValues, value];
      setFormData({ ...formData, [field]: newValues });
      return;
    }
    
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, [field]: newValues });
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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Dietary Preferences</DialogTitle>
          <DialogDescription>
            Update your dietary needs and restrictions
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Diet Type</Label>
              <RadioGroup
                value={formData.diet_type}
                onValueChange={(v) => setFormData({ ...formData, diet_type: v as typeof formData.diet_type })}
              >
                {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <RadioGroupItem value={type} id={`edit-diet-${type}`} />
                    <Label htmlFor={`edit-diet-${type}`} className="capitalize">
                      {type.replace("_", " ")}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Food Allergies</Label>
              <div className="space-y-2 mt-2">
                {["None", "Dairy", "Nuts", "Gluten", "Seafood", "Eggs", "Soy", "Others"].map((allergy) => (
                  <div key={allergy} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.food_allergies.includes(allergy)}
                      onCheckedChange={() => handleCheckboxChange("food_allergies", allergy)}
                      disabled={allergy !== "None" && formData.food_allergies.includes("None")}
                    />
                    <Label className={allergy !== "None" && formData.food_allergies.includes("None") ? "text-muted-foreground" : ""}>
                      {allergy}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Religious Dietary Restrictions</Label>
              <RadioGroup
                value={formData.religious_restrictions}
                onValueChange={(v) => setFormData({ ...formData, religious_restrictions: v as typeof formData.religious_restrictions })}
              >
                {["none", "hindu", "muslim", "jain"].map((restriction) => (
                  <div key={restriction} className="flex items-center space-x-2">
                    <RadioGroupItem value={restriction} id={`edit-religion-${restriction}`} />
                    <Label htmlFor={`edit-religion-${restriction}`} className="capitalize">
                      {restriction}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Spice Level</Label>
              <RadioGroup
                value={formData.spice_level}
                onValueChange={(v) => setFormData({ ...formData, spice_level: v as typeof formData.spice_level })}
              >
                {["mild", "medium", "spicy", "very_spicy"].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={`edit-spice-${level}`} />
                    <Label htmlFor={`edit-spice-${level}`} className="capitalize">
                      {level.replace("_", " ")}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Regional Cuisines</Label>
              <div className="space-y-2 mt-2">
                {["North Indian", "South Indian", "East Indian", "West Indian", "International"].map((cuisine) => (
                  <div key={cuisine} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.regional_cuisines.includes(cuisine)}
                      onCheckedChange={() => handleCheckboxChange("regional_cuisines", cuisine)}
                    />
                    <Label>{cuisine}</Label>
                  </div>
                ))}
              </div>
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
