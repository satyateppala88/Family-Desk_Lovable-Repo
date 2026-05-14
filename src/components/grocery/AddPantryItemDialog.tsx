import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import type { PantryItem } from "@/hooks/usePantryItems";
import type { PantryCategory } from "@/hooks/usePantryCategories";

interface AddPantryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: Partial<PantryItem>) => void;
  categories: PantryCategory[];
  householdId: string;
  userId: string;
  editItem?: PantryItem | null;
}

export const AddPantryItemDialog = ({
  open,
  onOpenChange,
  onSubmit,
  categories,
  householdId,
  userId,
  editItem,
}: AddPantryItemDialogProps) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [isStaple, setIsStaple] = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category || "");
      setQuantity(editItem.quantity?.toString() || "");
      setUnit(editItem.unit || "");
      setExpiryDate(editItem.expiry_date ? new Date(editItem.expiry_date) : undefined);
      setMinimumQuantity(editItem.minimum_quantity?.toString() || "");
      setIsStaple(editItem.is_staple);
    } else {
      setName("");
      setCategory("");
      setQuantity("");
      setUnit("");
      setExpiryDate(undefined);
      setMinimumQuantity("");
      setIsStaple(false);
    }
  }, [editItem, open]);

  const handleSubmit = () => {
    const item: Partial<PantryItem> = {
      household_id: householdId,
      added_by: userId,
      name,
      category: category || null,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null,
      expiry_date: expiryDate ? format(expiryDate, "yyyy-MM-dd") : null,
      minimum_quantity: minimumQuantity ? parseFloat(minimumQuantity) : 0,
      is_staple: isStaple,
      last_purchased_at: new Date().toISOString(),
    };

    onSubmit(item);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={editItem ? "Edit Pantry Item" : "Add Pantry Item"}
      description={editItem ? "Update the item details below." : "Add a new item to your pantry inventory."}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name}>
            {editItem ? "Update" : "Add"} Item
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rice, Toor Dal, Tomatoes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number" inputMode="numeric"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="2.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="packets">packets</SelectItem>
                  <SelectItem value="bottles">bottles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expiry Date (Optional)</Label>
            <DatePicker value={expiryDate} onChange={setExpiryDate} format="PPP" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minQty">Minimum Quantity (for alerts)</Label>
            <Input
              id="minQty"
              type="number" inputMode="numeric"
              step="0.1"
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="staple">Mark as Staple Item</Label>
            <Switch
              id="staple"
              checked={isStaple}
              onCheckedChange={setIsStaple}
            />
          </div>
      </div>
    </BottomSheet>
  );
};
