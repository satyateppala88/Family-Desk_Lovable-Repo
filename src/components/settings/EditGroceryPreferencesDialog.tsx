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

const GROCERY_FIELDS = [
  "pantry_size", "shopping_frequency", "shopping_locations",
  "organic_preference",
] as const;

export const EditGroceryPreferencesDialog = ({ preferences, onSave, isUpdating, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({
    pantry_size: preferences.pantry_size ?? "medium",
    shopping_frequency: preferences.shopping_frequency ?? "weekly",
    shopping_locations: preferences.shopping_locations ?? [],
    organic_preference: preferences.organic_preference ?? "sometimes",
  });

  useEffect(() => {
    if (open) {
      setData({
        pantry_size: preferences.pantry_size ?? "medium",
        shopping_frequency: preferences.shopping_frequency ?? "weekly",
        shopping_locations: preferences.shopping_locations ?? [],
        organic_preference: preferences.organic_preference ?? "sometimes",
      });
    }
  }, [open, preferences]);

  const toggleLoc = (v: string) => {
    const next = data.shopping_locations.includes(v)
      ? data.shopping_locations.filter((x) => x !== v)
      : [...data.shopping_locations, v];
    setData({ ...data, shopping_locations: next });
  };

  const handleSubmit = async () => {
    const updates: Partial<HouseholdPreferences> = {};
    GROCERY_FIELDS.forEach((f) => { (updates as Record<string, unknown>)[f] = data[f as keyof typeof data]; });
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
          <DialogTitle>Grocery preferences</DialogTitle>
          <DialogDescription>Pantry size, shopping cadence and locations.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            <div>
              <Label>Pantry size</Label>
              <RadioGroup className="mt-2" value={data.pantry_size} onValueChange={(v) => setData({ ...data, pantry_size: v as any })}>
                {["small", "medium", "large"].map((s) => (
                  <div key={s} className="flex items-center space-x-2"><RadioGroupItem value={s} id={`g-p-${s}`} /><Label htmlFor={`g-p-${s}`} className="capitalize">{s}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Shopping frequency</Label>
              <RadioGroup className="mt-2" value={data.shopping_frequency} onValueChange={(v) => setData({ ...data, shopping_frequency: v as any })}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="g-f1" /><Label htmlFor="g-f1">Daily</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="2_3_per_week" id="g-f2" /><Label htmlFor="g-f2">2–3 times per week</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="g-f3" /><Label htmlFor="g-f3">Weekly</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="bi_weekly" id="g-f4" /><Label htmlFor="g-f4">Bi-weekly</Label></div>
              </RadioGroup>
            </div>
            <div>
              <Label>Preferred shopping locations</Label>
              <div className="space-y-2 mt-2">
                {["Local markets/Kirana stores", "Supermarkets (DMart, More, Big Bazaar)", "Online (BigBasket, Blinkit, Zepto)", "Wholesale markets"].map((l) => (
                  <div key={l} className="flex items-center space-x-2">
                    <Checkbox checked={data.shopping_locations.includes(l)} onCheckedChange={() => toggleLoc(l)} />
                    <Label>{l}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Organic preference</Label>
              <RadioGroup className="mt-2" value={data.organic_preference} onValueChange={(v) => setData({ ...data, organic_preference: v as any })}>
                {["always", "sometimes", "rarely", "never"].map((p) => (
                  <div key={p} className="flex items-center space-x-2"><RadioGroupItem value={p} id={`g-o-${p}`} /><Label htmlFor={`g-o-${p}`} className="capitalize">{p}</Label></div>
                ))}
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
