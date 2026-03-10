import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share, FileText, ShoppingCart } from "lucide-react";
import { MealPlan } from "@/hooks/useMealPlans";
import { exportMealPlanAsPDF } from "@/lib/mealPlanExport";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface MealPlanDownloadProps {
  mealPlan: MealPlan | null;
  weekStart: Date;
  calendarRef: React.RefObject<HTMLDivElement>;
}

export const MealPlanDownload = ({ mealPlan, weekStart, calendarRef }: MealPlanDownloadProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDownloadPDF = () => {
    if (!mealPlan) {
      toast({ title: "No meal plan", description: "Generate a meal plan first.", variant: "destructive" });
      return;
    }
    try {
      exportMealPlanAsPDF(mealPlan, weekStart);
      toast({ title: "Exported", description: "Meal plan saved as PDF." });
    } catch {
      toast({ title: "Error", description: "Failed to export as PDF.", variant: "destructive" });
    }
  };

  const handleSendToGrocery = () => {
    if (!mealPlan) {
      toast({ title: "No meal plan", description: "Generate a meal plan first.", variant: "destructive" });
      return;
    }
    navigate("/grocery");
    toast({ title: "Opening Grocery", description: "Generate a shopping list from your meal plan." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share className="w-4 h-4 mr-1.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSendToGrocery}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Send to Grocery List
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
