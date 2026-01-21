import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckSquare, ChefHat, Calendar, ShoppingCart, Leaf } from "lucide-react";
import { ProductName } from "@/hooks/useEnabledProducts";

interface ProductSelectionStepProps {
  selectedProducts: ProductName[];
  onProductToggle: (product: ProductName) => void;
}

const products = [
  {
    name: "tasks" as ProductName,
    icon: CheckSquare,
    label: "Tasks",
    description: "Manage and track household tasks with priorities and assignments",
    color: "text-primary",
  },
  {
    name: "meals" as ProductName,
    icon: ChefHat,
    label: "Meals",
    description: "AI-powered meal planning with Indian recipes and dietary preferences",
    color: "text-accent",
  },
  {
    name: "calendar" as ProductName,
    icon: Calendar,
    label: "Calendar",
    description: "Track important dates, events, and schedules for your household",
    color: "text-[hsl(215,75%,55%)]",
  },
  {
    name: "grocery" as ProductName,
    icon: ShoppingCart,
    label: "Grocery",
    description: "Create shopping lists and manage pantry inventory efficiently",
    color: "text-[hsl(145,65%,45%)]",
  },
  {
    name: "habits" as ProductName,
    icon: Leaf,
    label: "Habits",
    description: "Build healthy routines with streak tracking and household habit goals",
    color: "text-[hsl(142,70%,45%)]",
  },
];

export const ProductSelectionStep = ({
  selectedProducts,
  onProductToggle,
}: ProductSelectionStepProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Choose Your Features</h2>
        <p className="text-muted-foreground">
          Select the features you want to use. You can change this anytime in settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => {
          const Icon = product.icon;
          const isSelected = selectedProducts.includes(product.name);

          return (
            <Card
              key={product.name}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "border-primary border-2" : ""
              }`}
              onClick={() => onProductToggle(product.name)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${product.color}`} />
                    <CardTitle className="text-lg">{product.label}</CardTitle>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onProductToggle(product.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{product.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedProducts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          Please select at least one feature to continue
        </p>
      )}
    </div>
  );
};
