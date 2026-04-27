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
}

const MEALS_FIELDS = [
  "diet_type", "spice_level", "food_allergies", "religious_restrictions",
  "regional_cuisines", "cooking_skill_level", "weekday_cooking_time",
  "preferred_meal_types",
] as const;

export const EditMealsPreferencesDialog = ({ preferences, onSave, isUpdating, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({
    diet_type: preferences.diet_type ?? "vegetarian",
    spice_level: preferences.spice_level ?? "medium",
    food_allergies: preferences.food_allergies ?? [],
    religious_restrictions: preferences.religious_restrictions ?? "none",
    regional_cuisines: preferences.regional_cuisines ?? [],
    cooking_skill_level: preferences.cooking_skill_level ?? "intermediate",
    weekday_cooking_time: preferences.weekday_cooking_time ?? "30_to_60",
    preferred_meal_types: preferences.preferred_meal_types ?? [],
  });

  useEffect(() => {
    if (open) {
      setData({
        diet_type: preferences.diet_type ?? "vegetarian",
        spice_level: preferences.spice_level ?? "medium",
        food_allergies: preferences.food_allergies ?? [],
        religious_restrictions: preferences.religious_restrictions ?? "none",
        regional_cuisines: preferences.regional_cuisines ?? [],
        cooking_skill_level: preferences.cooking_skill_level ?? "intermediate",
        weekday_cooking_time: preferences.weekday_cooking_time ?? "30_to_60",
        preferred_meal_types: preferences.preferred_meal_types ?? [],
      });
    }
  }, [open, preferences]);

  const toggle = (field: "food_allergies" | "regional_cuisines" | "preferred_meal_types", v: string) => {
    if (field === "food_allergies" && v === "None") {
      setData({ ...data, food_allergies: ["None"] });
      return;
    }
    const current = (data[field] as string[]).filter((x) => !(field === "food_allergies" && x === "None"));
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    setData({ ...data, [field]: next });
  };

  const handleSubmit = async () => {
    // Only send Meals-owned fields. Other modules' fields are untouched.
    const updates: Partial<HouseholdPreferences> = {};
    MEALS_FIELDS.forEach((f) => {
      (updates as Record<string, unknown>)[f] = data[f as keyof typeof data];
    });
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
          <DialogTitle>Meals preferences</DialogTitle>
          <DialogDescription>Diet, allergies, and cooking habits.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            <div>
              <Label>Diet type</Label>
              <RadioGroup className="mt-2" value={data.diet_type} onValueChange={(v) => setData({ ...data, diet_type: v as any })}>
                {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain"].map((t) => (
                  <div key={t} className="flex items-center space-x-2"><RadioGroupItem value={t} id={`m-d-${t}`} /><Label htmlFor={`m-d-${t}`} className="capitalize">{t.replace("_", " ")}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Spice level</Label>
              <RadioGroup className="mt-2" value={data.spice_level} onValueChange={(v) => setData({ ...data, spice_level: v as any })}>
                {["mild", "medium", "spicy", "very_spicy"].map((t) => (
                  <div key={t} className="flex items-center space-x-2"><RadioGroupItem value={t} id={`m-s-${t}`} /><Label htmlFor={`m-s-${t}`} className="capitalize">{t.replace("_", " ")}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Food allergies</Label>
              <div className="space-y-2 mt-2">
                {["None", "Dairy", "Nuts", "Gluten", "Seafood", "Eggs", "Soy", "Others"].map((a) => {
                  const noneSel = data.food_allergies.includes("None");
                  const checked = data.food_allergies.includes(a);
                  return (
                    <div key={a} className="flex items-center space-x-2">
                      <Checkbox checked={checked} disabled={a !== "None" && noneSel} onCheckedChange={() => toggle("food_allergies", a)} />
                      <Label className={a !== "None" && noneSel ? "text-muted-foreground" : ""}>{a}</Label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Religious dietary restrictions</Label>
              <RadioGroup className="mt-2" value={data.religious_restrictions} onValueChange={(v) => setData({ ...data, religious_restrictions: v as any })}>
                {["none", "hindu", "muslim", "jain"].map((r) => (
                  <div key={r} className="flex items-center space-x-2"><RadioGroupItem value={r} id={`m-r-${r}`} /><Label htmlFor={`m-r-${r}`} className="capitalize">{r}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Regional cuisines</Label>
              <div className="space-y-2 mt-2">
                {["North Indian", "South Indian", "East Indian", "West Indian", "International"].map((c) => (
                  <div key={c} className="flex items-center space-x-2">
                    <Checkbox checked={data.regional_cuisines.includes(c)} onCheckedChange={() => toggle("regional_cuisines", c)} />
                    <Label>{c}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Cooking skill</Label>
              <RadioGroup className="mt-2" value={data.cooking_skill_level} onValueChange={(v) => setData({ ...data, cooking_skill_level: v as any })}>
                {["beginner", "intermediate", "expert"].map((l) => (
                  <div key={l} className="flex items-center space-x-2"><RadioGroupItem value={l} id={`m-cs-${l}`} /><Label htmlFor={`m-cs-${l}`} className="capitalize">{l}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Weekday cooking time</Label>
              <RadioGroup className="mt-2" value={data.weekday_cooking_time} onValueChange={(v) => setData({ ...data, weekday_cooking_time: v as any })}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="less_than_30" id="m-t1" /><Label htmlFor="m-t1">Under 30 min</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="30_to_60" id="m-t2" /><Label htmlFor="m-t2">30–60 min</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="more_than_60" id="m-t3" /><Label htmlFor="m-t3">More than 60 min</Label></div>
              </RadioGroup>
            </div>
            <div>
              <Label>Preferred meal types</Label>
              <div className="space-y-2 mt-2">
                {["Quick weekday meals", "Traditional weekend meals", "Festival special recipes", "Healthy/Diet meals"].map((t) => (
                  <div key={t} className="flex items-center space-x-2">
                    <Checkbox checked={data.preferred_meal_types.includes(t)} onCheckedChange={() => toggle("preferred_meal_types", t)} />
                    <Label>{t}</Label>
                  </div>
                ))}
              </div>
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
