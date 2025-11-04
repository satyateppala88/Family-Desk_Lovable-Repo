import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";
import { format } from "date-fns";
import { MealPlan } from "@/hooks/useMealPlans";

export const exportMealPlanAsPDF = (mealPlan: MealPlan, weekStart: Date) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text("Weekly Meal Plan", 20, 20);
  
  // Week range
  doc.setFontSize(12);
  doc.text(`Week of ${format(weekStart, "MMMM d, yyyy")}`, 20, 30);
  
  // Create calendar table
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];
  
  const tableData: any[] = [];
  
  mealTypes.forEach(mealType => {
    const row: any[] = [mealType];
    daysOfWeek.forEach((_, dayIndex) => {
      const item = mealPlan.items?.find(
        i => i.day_of_week === dayIndex && i.meal_type.toLowerCase() === mealType.toLowerCase()
      );
      row.push(item?.recipe?.title || "-");
    });
    tableData.push(row);
  });
  
  autoTable(doc, {
    head: [["Meal", ...daysOfWeek]],
    body: tableData,
    startY: 40,
    theme: "grid",
    headStyles: { fillColor: [147, 51, 234] },
    styles: { fontSize: 8 },
  });
  
  // Shopping list on next page
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Shopping List", 20, 20);
  
  // Aggregate all ingredients
  const allIngredients: any[] = [];
  mealPlan.items?.forEach(item => {
    if (item.recipe?.ingredients) {
      const ingredients = Array.isArray(item.recipe.ingredients) 
        ? item.recipe.ingredients 
        : [];
      allIngredients.push(...ingredients);
    }
  });
  
  // Group by name
  const ingredientMap = new Map();
  allIngredients.forEach((ing: any) => {
    const name = ing.name || ing.item || "Unknown";
    const quantity = ing.quantity || "";
    const unit = ing.unit || "";
    
    if (ingredientMap.has(name)) {
      const existing = ingredientMap.get(name);
      existing.push({ quantity, unit });
    } else {
      ingredientMap.set(name, [{ quantity, unit }]);
    }
  });
  
  const shoppingListData: any[] = [];
  ingredientMap.forEach((quantities, name) => {
    const quantityStr = quantities
      .map((q: any) => `${q.quantity} ${q.unit}`.trim())
      .filter((s: string) => s)
      .join(", ") || "-";
    shoppingListData.push([name, quantityStr]);
  });
  
  autoTable(doc, {
    head: [["Ingredient", "Quantity"]],
    body: shoppingListData,
    startY: 30,
    theme: "striped",
    headStyles: { fillColor: [147, 51, 234] },
  });
  
  doc.save(`meal-plan-${format(weekStart, "yyyy-MM-dd")}.pdf`);
};

export const exportMealPlanAsImage = async (elementRef: HTMLElement) => {
  try {
    const dataUrl = await toPng(elementRef, {
      quality: 1.0,
      pixelRatio: 2,
    });
    
    const link = document.createElement("a");
    link.download = `meal-plan-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Error exporting as image:", error);
    throw error;
  }
};

export const exportMealPlanAsCSV = (mealPlan: MealPlan) => {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const rows = [
    ["Day", "Meal Type", "Recipe", "Prep Time (min)", "Cook Time (min)", "Difficulty"],
  ];
  
  mealPlan.items?.forEach(item => {
    rows.push([
      daysOfWeek[item.day_of_week],
      item.meal_type,
      item.recipe?.title || "-",
      item.recipe?.prep_time?.toString() || "-",
      item.recipe?.cook_time?.toString() || "-",
      item.recipe?.difficulty || "-",
    ]);
  });
  
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `meal-plan-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
