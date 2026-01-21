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

interface EditBudgetPreferencesDialogProps {
  preferences: HouseholdPreferences;
  onSave: (updates: Partial<HouseholdPreferences>) => Promise<void>;
  isUpdating?: boolean;
}

export const EditBudgetPreferencesDialog = ({
  preferences,
  onSave,
  isUpdating,
}: EditBudgetPreferencesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    monthly_grocery_budget: preferences.monthly_grocery_budget ?? "5000_to_10000",
    shopping_locations: preferences.shopping_locations ?? [],
    organic_preference: preferences.organic_preference ?? "sometimes",
    budget_consciousness: preferences.budget_consciousness ?? "somewhat",
  });

  const handleCheckboxChange = (value: string) => {
    const currentValues = formData.shopping_locations;
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, shopping_locations: newValues });
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
          <DialogTitle>Edit Budget & Shopping</DialogTitle>
          <DialogDescription>
            Update your budget and shopping preferences
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Monthly Grocery Budget</Label>
              <RadioGroup
                value={formData.monthly_grocery_budget}
                onValueChange={(v) => setFormData({ ...formData, monthly_grocery_budget: v as typeof formData.monthly_grocery_budget })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="under_5000" id="edit-budget1" />
                  <Label htmlFor="edit-budget1">Under ₹5,000</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5000_to_10000" id="edit-budget2" />
                  <Label htmlFor="edit-budget2">₹5,000 - ₹10,000</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10000_to_20000" id="edit-budget3" />
                  <Label htmlFor="edit-budget3">₹10,000 - ₹20,000</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="above_20000" id="edit-budget4" />
                  <Label htmlFor="edit-budget4">Above ₹20,000</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred Shopping Locations</Label>
              <div className="space-y-2 mt-2">
                {["Local markets/Kirana stores", "Supermarkets (DMart, More, Big Bazaar)", "Online (BigBasket, Blinkit, Zepto)", "Wholesale markets"].map((location) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.shopping_locations.includes(location)}
                      onCheckedChange={() => handleCheckboxChange(location)}
                    />
                    <Label>{location}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Organic/Premium Products Preference</Label>
              <RadioGroup
                value={formData.organic_preference}
                onValueChange={(v) => setFormData({ ...formData, organic_preference: v as typeof formData.organic_preference })}
              >
                {["always", "sometimes", "rarely", "never"].map((pref) => (
                  <div key={pref} className="flex items-center space-x-2">
                    <RadioGroupItem value={pref} id={`edit-organic-${pref}`} />
                    <Label htmlFor={`edit-organic-${pref}`} className="capitalize">
                      {pref}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Budget Consciousness</Label>
              <RadioGroup
                value={formData.budget_consciousness}
                onValueChange={(v) => setFormData({ ...formData, budget_consciousness: v as typeof formData.budget_consciousness })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="very_conscious" id="edit-conscious1" />
                  <Label htmlFor="edit-conscious1">Very conscious</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="somewhat" id="edit-conscious2" />
                  <Label htmlFor="edit-conscious2">Somewhat conscious</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_much" id="edit-conscious3" />
                  <Label htmlFor="edit-conscious3">Not much</Label>
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
