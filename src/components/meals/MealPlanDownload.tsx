import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Image, Table } from "lucide-react";
import { MealPlan } from "@/hooks/useMealPlans";
import { exportMealPlanAsPDF, exportMealPlanAsImage, exportMealPlanAsCSV } from "@/lib/mealPlanExport";
import { useToast } from "@/hooks/use-toast";

interface MealPlanDownloadProps {
  mealPlan: MealPlan | null;
  weekStart: Date;
  calendarRef: React.RefObject<HTMLDivElement>;
}

export const MealPlanDownload = ({ mealPlan, weekStart, calendarRef }: MealPlanDownloadProps) => {
  const { toast } = useToast();

  const handleDownloadPDF = () => {
    if (!mealPlan) {
      toast({
        title: "No meal plan",
        description: "Generate a meal plan first to download it.",
        variant: "destructive",
      });
      return;
    }

    try {
      exportMealPlanAsPDF(mealPlan, weekStart);
      toast({
        title: "Downloaded",
        description: "Meal plan exported as PDF successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export meal plan as PDF.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = async () => {
    if (!mealPlan || !calendarRef.current) {
      toast({
        title: "No meal plan",
        description: "Generate a meal plan first to download it.",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportMealPlanAsImage(calendarRef.current);
      toast({
        title: "Downloaded",
        description: "Meal plan exported as image successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export meal plan as image.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCSV = () => {
    if (!mealPlan) {
      toast({
        title: "No meal plan",
        description: "Generate a meal plan first to download it.",
        variant: "destructive",
      });
      return;
    }

    try {
      exportMealPlanAsCSV(mealPlan);
      toast({
        title: "Downloaded",
        description: "Meal plan exported as CSV successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export meal plan as CSV.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadImage}>
          <Image className="w-4 h-4 mr-2" />
          Download as Image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadCSV}>
          <Table className="w-4 h-4 mr-2" />
          Download as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
