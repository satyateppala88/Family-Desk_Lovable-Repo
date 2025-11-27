import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PantryItem } from "@/hooks/usePantryItems";

interface QuickAddChecklistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (items: Partial<PantryItem>[]) => void;
  householdId: string;
  userId: string;
}

// Common Indian household items organized by category
const COMMON_ITEMS = [
  {
    category: "Grains & Lentils",
    icon: "🌾",
    items: [
      { name: "Rice", unit: "kg" },
      { name: "Wheat Flour", unit: "kg" },
      { name: "Besan (Gram Flour)", unit: "kg" },
      { name: "Rava (Semolina)", unit: "kg" },
      { name: "Poha", unit: "g" },
      { name: "Toor Dal", unit: "kg" },
      { name: "Moong Dal", unit: "kg" },
      { name: "Chana Dal", unit: "kg" },
      { name: "Urad Dal", unit: "kg" },
      { name: "Masoor Dal", unit: "kg" },
    ],
  },
  {
    category: "Spices & Masalas",
    icon: "🌶️",
    items: [
      { name: "Turmeric Powder", unit: "g" },
      { name: "Red Chili Powder", unit: "g" },
      { name: "Cumin Seeds", unit: "g" },
      { name: "Coriander Powder", unit: "g" },
      { name: "Garam Masala", unit: "g" },
      { name: "Mustard Seeds", unit: "g" },
      { name: "Black Pepper", unit: "g" },
      { name: "Cinnamon", unit: "g" },
      { name: "Cardamom", unit: "g" },
    ],
  },
  {
    category: "Dairy & Eggs",
    icon: "🥛",
    items: [
      { name: "Milk", unit: "L" },
      { name: "Curd/Dahi", unit: "g" },
      { name: "Paneer", unit: "g" },
      { name: "Butter", unit: "g" },
      { name: "Ghee", unit: "g" },
      { name: "Eggs", unit: "pcs" },
    ],
  },
  {
    category: "Staples",
    icon: "🧂",
    items: [
      { name: "Salt", unit: "kg" },
      { name: "Sugar", unit: "kg" },
      { name: "Cooking Oil", unit: "L" },
      { name: "Tea", unit: "g" },
      { name: "Coffee", unit: "g" },
    ],
  },
  {
    category: "Vegetables",
    icon: "🥬",
    items: [
      { name: "Onions", unit: "kg" },
      { name: "Tomatoes", unit: "kg" },
      { name: "Potatoes", unit: "kg" },
      { name: "Garlic", unit: "g" },
      { name: "Ginger", unit: "g" },
      { name: "Green Chilies", unit: "g" },
    ],
  },
];

export const QuickAddChecklist = ({ open, onOpenChange, onSubmit, householdId, userId }: QuickAddChecklistProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleToggle = (itemKey: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const handleSubmit = () => {
    const items: Partial<PantryItem>[] = [];
    
    COMMON_ITEMS.forEach((categoryGroup) => {
      categoryGroup.items.forEach((item) => {
        const itemKey = `${categoryGroup.category}-${item.name}`;
        if (selectedItems.has(itemKey)) {
          items.push({
            household_id: householdId,
            added_by: userId,
            name: item.name,
            category: categoryGroup.category,
            unit: item.unit,
            quantity: 1,
            is_staple: true,
            minimum_quantity: 0.5,
          });
        }
      });
    });

    onSubmit(items);
    onOpenChange(false);
    setSelectedItems(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Quick Add from Checklist</DialogTitle>
          <DialogDescription>
            Select common items you have in your kitchen. You can adjust quantities later.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {COMMON_ITEMS.map((categoryGroup) => (
              <div key={categoryGroup.category} className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-xl">{categoryGroup.icon}</span>
                  {categoryGroup.category}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {categoryGroup.items.map((item) => {
                    const itemKey = `${categoryGroup.category}-${item.name}`;
                    return (
                      <div key={itemKey} className="flex items-center space-x-2">
                        <Checkbox
                          id={itemKey}
                          checked={selectedItems.has(itemKey)}
                          onCheckedChange={() => handleToggle(itemKey)}
                        />
                        <Label
                          htmlFor={itemKey}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {item.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={selectedItems.size === 0}>
              Add Selected Items
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
