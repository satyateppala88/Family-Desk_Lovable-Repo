import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit Pantry Item" : "Add Pantry Item"}</DialogTitle>
          <DialogDescription>
            {editItem ? "Update the item details below." : "Add a new item to your pantry inventory."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              <SelectContent>
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
                type="number"
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
                <SelectContent>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minQty">Minimum Quantity (for alerts)</Label>
            <Input
              id="minQty"
              type="number"
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name}>
            {editItem ? "Update" : "Add"} Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
