import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, CheckCircle } from "lucide-react";

export const PantryEducationBanner = () => {
  return (
    <Alert>
      <Lightbulb className="h-5 w-5" />
      <AlertTitle>Keep Your Pantry Accurate</AlertTitle>
      <AlertDescription className="space-y-2 mt-2">
        <p>Your pantry inventory stays accurate when you:</p>
        <ul className="space-y-1 ml-4">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>Mark meals as cooked after preparing them (auto-updates pantry)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>Follow your weekly meal plan closely</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>Add items to pantry when you shop</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>Update quantities when you use items outside meal plans</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};
